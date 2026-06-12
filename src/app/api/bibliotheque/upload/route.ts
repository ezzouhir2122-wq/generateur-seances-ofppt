import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Génère le token d'upload côté serveur puis valide le dépôt (client upload).
// Évite la limite de taille des routes serverless en téléversant directement vers Blob.
export async function POST(request: Request): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.ms-powerpoint",
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "image/png",
          "image/jpeg",
          "image/webp",
        ],
        maximumSizeInBytes: 20 * 1024 * 1024, // 20 Mo
        addRandomSuffix: true,
      }),
      onUploadCompleted: async () => {
        // Rien à faire ici : l'enregistrement se fait via POST /api/bibliotheque
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur d'upload" },
      { status: 400 }
    );
  }
}
