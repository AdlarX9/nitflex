import sys
import os
import subprocess
import json
import shutil

def get_video_resolution(video_path):
    """Utilise ffprobe pour détecter la résolution de la vidéo"""
    cmd = [
        "ffprobe", "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height,r_frame_rate",
        "-of", "json", video_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print("Erreur ffprobe:", result.stderr)
        return None, None, None
    info = json.loads(result.stdout)
    stream = info["streams"][0]
    width = stream["width"]
    height = stream["height"]
    frame_rate = stream.get("r_frame_rate", "24/1")
    # Résolution sous forme Apple (ex: "4K", "1080p60")
    if width >= 3840:
        res = "4K"
    elif height >= 1080:
        res = "1080p"
    elif height >= 720:
        res = "720p"
    else:
        res = f"{height}p"
    # Frame rate
    try:
        num, den = map(int, frame_rate.split('/'))
        fps = num / den
        if fps > 50:
            res += "60"
        elif fps > 25:
            res += "30"
    except Exception:
        pass
    return res, width, height

def convert_to_apple_surround(input_path, output_path, preset_name):
    """Convertit le fichier en Apple Surround via HandBrakeCLI"""
    cmd = [
        "HandBrakeCLI",
        "-i", input_path,
        "-o", output_path,
        "--preset", preset_name
    ]
    print("Conversion:", " ".join(cmd))
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print("Erreur HandBrakeCLI:", result.stderr)
        return False
    return True

def set_metadata_ffmpeg(file_path, metadata):
    """Ajoute les métadonnées avec ffmpeg"""
    # Crée une commande ffmpeg pour copier la vidéo et ajouter les métadonnées
    meta_args = []
    if metadata.get("title"):
        meta_args += ["-metadata", f"title={metadata['title']}"]
    if metadata.get("year"):
        meta_args += ["-metadata", f"year={metadata['year']}"]
    if metadata.get("genre"):
        meta_args += ["-metadata", f"genre={metadata['genre']}"]
    if metadata.get("director"):
        meta_args += ["-metadata", f"director={metadata['director']}"]
    if metadata.get("plot"):
        meta_args += ["-metadata", f"comment={metadata['plot']}"]
    if metadata.get("actors"):
        meta_args += ["-metadata", f"artist={metadata['actors']}"]
    tmp_path = file_path + ".meta.mp4"
    cmd = [
        "ffmpeg", "-i", file_path, "-c", "copy"
    ] + meta_args + [tmp_path, "-y"]
    print("Ajout métadonnées:", " ".join(cmd))
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print("Erreur ffmpeg:", result.stderr)
        return False
    # Remplace le fichier original
    shutil.move(tmp_path, file_path)
    return True

def main():
    if len(sys.argv) < 3:
        print("Usage: process_movie.py <video_path> <omdb_id>")
        sys.exit(1)

    movie = json.loads(sys.argv[1])
    video_path = os.path.join('.', 'uploads', movie['customTitle'])

    print(f"Traitement vidéo : {movie['video_path']} / OMDb ID: {movie['omdb_id']}")

    # 1. Détection de la résolution
    res, width, height = get_video_resolution(video_path)
    print(f"Résolution détectée: {res} ({width}x{height})")

    # 2. Détermine le preset Apple Surround
    preset_name = f"Apple {res} Surround"
    print(f"Preset HandBrake: {preset_name}")

    # 3. Conversion vidéo
    out_path = os.path.splitext(video_path)[0] + ".apple.mp4"
    success = convert_to_apple_surround(video_path, out_path, preset_name)
    if not success:
        print("Échec de la conversion HandBrake.")
        sys.exit(2)

    # 4. Ajout des métadonnées
    success = set_metadata_ffmpeg(out_path, movie)
    if not success:
        print("Échec de l'ajout des métadonnées.")
        sys.exit(3)

    print("Conversion et métadonnées terminées avec succès.")
    print("Fichier final:", out_path)

if __name__ == "__main__":
    main()
