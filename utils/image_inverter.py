from PIL import Image, ImageOps


def invert_and_mirror(input_path, output_path):
    # Ouvre l'image en mode RGBA pour gérer la transparence
    img = Image.open(input_path).convert("RGBA")
    r, g, b, a = img.split()
    # Inverse uniquement les canaux RGB, conserve Alpha inchangé
    rgb_inverted = ImageOps.invert(Image.merge("RGB", (r, g, b)))
    # Recompose avec l'alpha original
    inverted_img = Image.merge("RGBA", (*rgb_inverted.split(), a))
    # Miroir horizontal
    mirrored_img = inverted_img.transpose(Image.FLIP_LEFT_RIGHT)
    # Sauvegarde en PNG (pour garder la transparence)
    mirrored_img.save(output_path, format="PNG")


if __name__ == "__main__":
    entree = "entree.png"  # Chemin vers l'image source PNG
    sortie = "sortie.png"  # Chemin vers l'image de sortie PNG
    invert_and_mirror(entree, sortie)
    print(f"Image PNG transformée et sauvegardée sous {sortie}")
