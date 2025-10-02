#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Nitflex Movie Transformation Pipeline

This script converts video files to Apple-compatible formats with proper metadata.
Supports both local (Electron) and remote (API) processing.

Usage:
    python transform_movie.py <movie_json> [--output-dir <dir>]

Requirements:
    - HandBrakeCLI
    - ffmpeg
    - AtomicParsley
"""

import os
import sys
import subprocess
import json
import argparse
import logging
from pathlib import Path
from typing import Dict, Tuple, Optional
import shutil

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def check_dependencies() -> bool:
    """Check if required tools are installed."""
    required_tools = ['HandBrakeCLI', 'ffmpeg', 'AtomicParsley']
    missing = []
    
    for tool in required_tools:
        try:
            subprocess.run([tool, '--version'], 
                         stdout=subprocess.DEVNULL, 
                         stderr=subprocess.DEVNULL,
                         check=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            missing.append(tool)
    
    if missing:
        logger.error(f"Missing required tools: {', '.join(missing)}")
        logger.error("Please install them before running this script.")
        return False
    
    return True

def get_video_resolution(video_path: str) -> Tuple[str, int, int]:
    """Detect video resolution using ffprobe."""
    logger.info(f"Detecting resolution for: {video_path}")
    cmd = [
        "ffprobe", "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height,r_frame_rate",
        "-of", "json", video_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        logger.error(f"Error detecting resolution: {result.stderr}")
        logger.warning("Using default resolution: 1080p")
        return ("1080p", 1920, 1080)
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

def convert_to_apple_surround(input_path: str, output_path: str, preset_name: str) -> bool:
    """Convert video using HandBrakeCLI with Apple preset."""
    logger.info(f"Converting video with preset: {preset_name}")
    cmd = [
        "HandBrakeCLI",
        "-i", input_path,
        "-o", output_path,
        "--preset", preset_name
    ]
    print("Conversion:", " ".join(cmd))
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        logger.error(f"HandBrake conversion failed: {result.stderr}")
        return False
    logger.info("HandBrake conversion successful")
    return True

def set_metadata_ffmpeg(video_path: str, movie: Dict) -> bool:
    """Add metadata to video file using ffmpeg."""
    logger.info("Adding metadata to video file")
    # Crée une commande ffmpeg pour copier la vidéo et ajouter les métadonnées
    meta_args = []
    if movie.get("title"):
        meta_args += ["-metadata", f"title={movie['title']}"]
    if movie.get("year"):
        meta_args += ["-metadata", f"year={movie['year']}"]
    if movie.get("genre"):
        meta_args += ["-metadata", f"genre={movie['genre']}"]
    if movie.get("director"):
        meta_args += ["-metadata", f"director={movie['director']}"]
    if movie.get("plot"):
        meta_args += ["-metadata", f"comment={movie['plot']}"]
    if movie.get("actors"):
        meta_args += ["-metadata", f"artist={movie['actors']}"]
    tmp_path = video_path + ".meta.mp4"
    cmd = [
        "ffmpeg", "-i", video_path, "-c", "copy"
    ] + meta_args + [tmp_path, "-y"]
    print("Ajout métadonnées:", " ".join(cmd))
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        logger.error(f"Failed to add metadata: {result.stderr}")
        return False
    # Remplace le fichier original
    shutil.move(tmp_path, video_path)
    logger.info("Metadata added successfully")
    return True

def process_movie(movie: Dict, output_dir: Optional[str] = None) -> Tuple[bool, str]:
    """Process a movie: convert and add metadata."""
    video_path = os.path.join('.', 'uploads', movie['customTitle'])
    
    if not os.path.exists(video_path):
        logger.error(f"Video file not found: {video_path}")
        return False, ""
    
    logger.info(f"Processing video: {video_path}")
    logger.info(f"TMDB ID: {movie.get('tmdbID', 'N/A')}")
    
    # 1. Detect resolution
    res, width, height = get_video_resolution(video_path)
    logger.info(f"Detected resolution: {res} ({width}x{height})")
    
    # 2. Determine Apple Surround preset
    preset_name = f"Apple {res} Surround"
    logger.info(f"Using HandBrake preset: {preset_name}")
    
    # 3. Determine output path
    if output_dir:
        Path(output_dir).mkdir(parents=True, exist_ok=True)
        filename = Path(video_path).stem + ".apple.mp4"
        out_path = os.path.join(output_dir, filename)
    else:
        out_path = os.path.splitext(video_path)[0] + ".apple.mp4"
    
    logger.info(f"Output file: {out_path}")
    
    # 4. Convert video
    success = convert_to_apple_surround(video_path, out_path, preset_name)
    if not success:
        logger.error("Video conversion failed")
        return False, ""
    
    # 5. Add metadata
    success = set_metadata_ffmpeg(out_path, movie)
    if not success:
        logger.error("Metadata addition failed")
        return False, out_path
    
    logger.info("Processing completed successfully")
    logger.info(f"Final file: {out_path}")
    
    return True, out_path

def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(
        description='Transform movie files to Apple-compatible format with metadata'
    )
    parser.add_argument('movie_json', help='JSON string containing movie information')
    parser.add_argument('--output-dir', '-o', help='Output directory for processed file')
    parser.add_argument('--check-deps', action='store_true', 
                       help='Check if required dependencies are installed')
    
    args = parser.parse_args()
    
    # Check dependencies if requested
    if args.check_deps:
        if check_dependencies():
            logger.info("All required dependencies are installed")
            sys.exit(0)
        else:
            sys.exit(1)
    
    # Check dependencies before processing
    if not check_dependencies():
        sys.exit(1)
    
    # Parse movie JSON
    try:
        movie = json.loads(args.movie_json)
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON: {e}")
        sys.exit(1)
    
    # Process the movie
    success, output_path = process_movie(movie, args.output_dir)
    
    if success:
        # Return JSON result for programmatic use
        result = {
            "success": True,
            "output_path": output_path,
            "message": "Processing completed successfully"
        }
        print(json.dumps(result))
        sys.exit(0)
    else:
        result = {
            "success": False,
            "error": "Processing failed",
            "output_path": output_path if output_path else None
        }
        print(json.dumps(result))
        sys.exit(1)

if __name__ == "__main__":
    main()
