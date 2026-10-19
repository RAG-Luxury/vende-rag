export function GET(): Response {
  return Response.json({
    applinks: {
      details: [
        {
          appIDs: ['JXWS6CS78Z.com.venderag.app'],
          components: [{ '/': '/app/verify-email' }, { '/': '/app/reset-password' }],
        },
      ],
    },
  });
}
