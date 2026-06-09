import sys
import imageio

def convert_webp_to_mp4(input_path, output_path):
    print(f"Converting {input_path} to {output_path}...")
    try:
        reader = imageio.get_reader(input_path)
        fps = reader.get_meta_data().get('fps', 10) # default to 10 fps if not found
        if fps == 0:
            fps = 10
        writer = imageio.get_writer(output_path, fps=fps, codec='libx264')
        for frame in reader:
            writer.append_data(frame)
        writer.close()
        print(f"Success: {output_path}")
    except Exception as e:
        print(f"Error converting {input_path}: {e}")

if __name__ == '__main__':
    convert_webp_to_mp4('demo_smartliva_1780987246259.webp', 'demo_smartliva.mp4')
    convert_webp_to_mp4('demo_picha_1780987338014.webp', 'demo_picha.mp4')
    convert_webp_to_mp4('demo_axia_1780987659885.webp', 'demo_axia.mp4')
