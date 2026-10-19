export async function GET(
  request: Request,
  context: { params: Promise<{ action: string }> },
): Promise<Response> {
  const { action } = await context.params;
  const token = new URL(request.url).searchParams.get('token');
  if (
    !['verify-email', 'reset-password'].includes(action) ||
    !token ||
    !/^[a-f0-9]{64}$/.test(token)
  ) {
    return new Response('Enlace inválido.', { status: 400 });
  }
  // Fallback when iOS opens Safari instead of the associated app. GET never consumes the token.
  return new Response(null, {
    status: 302,
    headers: {
      Location: `rag:///app/${action}?token=${encodeURIComponent(token)}`,
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
    },
  });
}
