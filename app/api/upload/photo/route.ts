import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Photo upload is disabled in this environment. Please configure S3 or Cloudinary storage for persistent photo uploads.' },
    { status: 501 }
  );
}

