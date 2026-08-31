const CANONICAL_ORIGIN = 'https://hypertext.studio';

export default {
  async fetch(request: Request): Promise<Response> {
    const source = new URL(request.url);
    const destination = new URL(`${source.pathname}${source.search}`, CANONICAL_ORIGIN);

    return Response.redirect(destination.toString(), 308);
  },
};
