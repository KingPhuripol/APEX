#!/bin/bash
set -e

convert_file() {
    input="$1"
    base="${input%.webp}"
    echo "Converting $input..."
    if [ ! -f "${base}.gif" ]; then
        magick "$input" "${base}.gif"
    fi
    ffmpeg -y -i "${base}.gif" -vf "pad=ceil(iw/2)*2:ceil(ih/2)*2" -vcodec libx264 -pix_fmt yuv420p "${base}.mp4"
    rm "${base}.gif"
    echo "Successfully created ${base}.mp4"
}

convert_file "demo_smartliva_1780987246259.webp"
convert_file "demo_picha_1780987338014.webp"
convert_file "demo_axia_1780987659885.webp"
