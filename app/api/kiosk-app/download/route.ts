import { NextRequest, NextResponse } from "next/server";
import {
  adminClient,
  getAuthContext,
} from "@/lib/api-auth";

const KIOSK_APP_BUCKET =
  "kiosk-app-releases";

const KIOSK_APP_FILE =
  "ShepherdKids-Kiosk-v1.0.apk";

const SIGNED_URL_SECONDS =
  60;

export async function GET(
  request: NextRequest,
) {
  const auth =
    await getAuthContext(request);

  if (!auth) {
    return NextResponse.json(
      {
        error:
          "You must be signed in to download the ShepherdKids Kiosk App.",
      },
      {
        status: 401,
      },
    );
  }

  const admin =
    adminClient();

  const {
    data,
    error,
  } =
    await admin.storage
      .from(KIOSK_APP_BUCKET)
      .createSignedUrl(
        KIOSK_APP_FILE,
        SIGNED_URL_SECONDS,
        {
          download:
            KIOSK_APP_FILE,
        },
      );

  if (
    error ||
    !data?.signedUrl
  ) {
    console.error(
      "Unable to create kiosk app download URL:",
      error?.message ??
        "No signed URL returned.",
    );

    return NextResponse.json(
      {
        error:
          "The ShepherdKids Kiosk App download is temporarily unavailable.",
      },
      {
        status: 503,
      },
    );
  }

  return NextResponse.redirect(
    data.signedUrl,
    {
      status: 307,
    },
  );
}