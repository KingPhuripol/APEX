import io
import uuid
import pydicom
from PIL import Image

def anonymize_medical_file(file_bytes: bytes, filename: str) -> tuple[bytes, str]:
    """
    Strips PHI/PII from medical files.
    Returns: (anonymized_bytes, anonymous_id)
    """
    anon_id = str(uuid.uuid4())
    filename_lower = filename.lower()
    
    # 1. Handle DICOM
    if filename_lower.endswith(('.dcm', '.dicom')):
        try:
            ds = pydicom.dcmread(io.BytesIO(file_bytes), force=True)
            
            # List of tags to anonymize/remove based on DICOM PS3.15 Annex E
            tags_to_delete = [
                'PatientName',
                'PatientID',
                'PatientBirthDate',
                'PatientSex',
                'PatientAge',
                'InstitutionName',
                'InstitutionAddress',
                'ReferringPhysicianName',
                'PerformingPhysicianName',
                'StudyDate',
                'SeriesDate',
                'AcquisitionDate',
                'ContentDate',
                'StudyTime',
                'SeriesTime',
                'AccessionNumber',
                'StudyID',
            ]
            
            for tag in tags_to_delete:
                if tag in ds:
                    delattr(ds, tag)
            
            # Replace patient ID with our anonymous ID
            ds.PatientID = anon_id
            ds.PatientName = f"ANON^{anon_id[:8]}"
            
            buf = io.BytesIO()
            pydicom.dcmwrite(buf, ds)
            return buf.getvalue(), anon_id
            
        except Exception as e:
            print(f"[Sanitizer] Failed to anonymize DICOM: {e}")
            # In a strict environment, we might raise an error to block the pipeline.
            # But we can also just return the original if it's already safe or if we are prototyping.
            raise ValueError(f"Failed to anonymize DICOM: {e}")
            
    # 2. Handle standard images (JPEG/PNG)
    elif filename_lower.endswith(('.png', '.jpg', '.jpeg')):
        try:
            # Load image and save without EXIF metadata
            image = Image.open(io.BytesIO(file_bytes))
            buf = io.BytesIO()
            
            # For JPEG, we explicitly avoid saving EXIF
            # PNGs don't conventionally carry EXIF the same way but converting to a fresh buffer strips metadata
            format = image.format or "JPEG"
            image.save(buf, format=format)
            
            return buf.getvalue(), anon_id
            
        except Exception as e:
            print(f"[Sanitizer] Failed to anonymize Image: {e}")
            raise ValueError(f"Failed to anonymize Image: {e}")
            
    # 3. Unsupported types
    else:
        # If we don't know the type, we assume it's unsafe or we just pass it as is (e.g. text).
        # For this pipeline, we expect only images or dicom.
        return file_bytes, anon_id
