import sys
import shutil
import os

def move_to_nas(filepath):
    nas_dir = "/mnt/nas/films/"
    dest_path = os.path.join(nas_dir, os.path.basename(filepath))
    shutil.move(filepath, dest_path)

if __name__ == "__main__":
    filepath = sys.argv[1]
    move_to_nas(filepath)
