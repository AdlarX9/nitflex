import os
from PIL import Image


def generate_mac_icons(input_png, output_dir="MacIcons.iconset"):
    # Dimensions standards pour une icône Mac (.icns)
    sizes = [
        (16, False),
        (16, True),
        (32, False),
        (32, True),
        (64, False),
        (128, False),
        (128, True),
        (256, False),
        (256, True),
        (512, False),
        (512, True),
        (1024, False),
    ]
    suffix = lambda size, retina: f"{size}x{size}{'@2x' if retina else ''}.png"

    # Créer le dossier de sortie
    os.makedirs(output_dir, exist_ok=True)

    # Ouvre l'image source
    img = Image.open(input_png).convert("RGBA")

    for size, retina in sizes:
        out_size = (size * 2, size * 2) if retina else (size, size)
        img_resized = img.resize(out_size, Image.LANCZOS)
        filename = f"icon_{suffix(size, retina)}"
        img_resized.save(os.path.join(output_dir, filename), "PNG")
        print(f"Généré: {filename}")

    print(
        f"\nToutes les tailles d'icônes ont été générées dans le dossier '{output_dir}'."
    )


if __name__ == "__main__":
    # Exemple d'utilisation
    input_image = "sortie.png"  # Remplace par le nom de ton image source
    output_iconset = "MonApp.iconset"
    generate_mac_icons(input_image, output_iconset)
    print(f"\nPour créer le fichier .icns à partir de ce dossier :")
    print(f"iconutil -c icns {output_iconset}")
