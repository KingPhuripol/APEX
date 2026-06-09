import io
import cv2
import tempfile
import logging
from PIL import Image
import os
import asyncio
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

# Dedicated executor for running synchronous inference inside the FastAPI event loop
_executor = ThreadPoolExecutor(max_workers=4)

def process_video_sync(video_path: str, run_inference_fn, sample_rate_fps: float = 1.0) -> list[dict]:
    """
    Extract frames from a video file and run inference on them synchronously.
    Returns a time-series list of results.
    """
    logger.info(f"Processing video: {video_path}")
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise RuntimeError("Failed to open video file")

    video_fps = cap.get(cv2.CAP_PROP_FPS)
    if video_fps <= 0:
        video_fps = 30.0

    frame_interval = int(video_fps / sample_rate_fps)
    if frame_interval < 1:
        frame_interval = 1

    results = []
    frame_count = 0
    success = True

    while success:
        success, frame = cap.read()
        if not success:
            break
            
        # Sample frames based on frame_interval
        if frame_count % frame_interval == 0:
            timestamp_sec = frame_count / video_fps
            
            # Convert BGR (OpenCV) to RGB (PIL) since our model expects PIL images
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            pil_image = Image.fromarray(rgb_frame)
            
            logger.debug(f"Running inference on frame at {timestamp_sec:.2f}s")
            
            try:
                # Call the SmartLiva inference engine (hybrid_analyzer or vision_analyzer)
                inference_result = run_inference_fn(pil_image)
                
                # Format to merge timeline data
                result_entry = {
                    "timestamp_sec": round(timestamp_sec, 2),
                    "data": inference_result
                }
                results.append(result_entry)
            except Exception as e:
                logger.error(f"Inference failed at {timestamp_sec:.2f}s: {e}")
                results.append({
                    "timestamp_sec": round(timestamp_sec, 2),
                    "error": str(e)
                })

        frame_count += 1

    cap.release()
    return results

async def process_video_async(video_bytes: bytes, run_inference_fn, sample_rate_fps: float = 1.0) -> list[dict]:
    """
    Wrapper to process video without blocking the main event loop.
    Reads bytes into a temporary file and uses ThreadPoolExecutor.
    """
    # Write bytes to temporary file for OpenCV to read
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
        tmp.write(video_bytes)
        tmp_path = tmp.name

    try:
        loop = asyncio.get_running_loop()
        results = await loop.run_in_executor(
            _executor, 
            process_video_sync, 
            tmp_path, 
            run_inference_fn, 
            sample_rate_fps
        )
        return results
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
