export default () => {
  return (
    <>
      <div className="bg-accent-1 border-b border-accent-2">
        <div className="container mx-auto px-5 py-2 text-center text-sm">
          The source code for this page is{' '}
          <a
            href="https://github.com/zeit/next.js/tree/canary/examples/cms-datocms"
            className="underline hover:text-success"
          >
            available on GitHub
          </a>
          .
        </div>
      </div>
      <div className="container mx-auto px-5 mt-16">
        <div className="flex-col md:flex-row flex items-center md:justify-between mb-16 md:mb-12">
          <h1 className="text-6xl md:text-8xl font-bold tracking-tighter leading-tight md:pr-8">
            Blog.
          </h1>
          <h4 className="text-center md:text-left text-lg mt-5 md:pl-8">
            A statically generated blog example using{' '}
            <a
              href="https://nextjs.org/"
              className="underline hover:text-success"
            >
              Next.js
            </a>{' '}
            and{' '}
            <a
              href="https://www.datocms.com/"
              className="underline hover:text-success"
            >
              DatoCMS
            </a>
            .
          </h4>
        </div>
        <div className="mb-8 md:mb-16 -mx-5 sm:mx-0">
          <img src="/images/image.jpg" className="shadow-magical" />
        </div>
        <div className="md:grid md:grid-cols-2 md:col-gap-16 lg:col-gap-8 mb-20 md:mb-28">
          <div>
            <h3 className="mb-4 text-4xl lg:text-6xl leading-tight">
              Learn how to pre-render pages using Static Generation using
              Next.js
            </h3>
          </div>
          <div>
            <p className="text-lg leading-relaxed mb-5">
              Lorem Ipsum is simply dummy text of the printing and typesetting
              industry. Lorem Ipsum has been the industry's standard dummy text
              ever since the 1500s, when an unknown printer took a galley of
              type and scrambled it to make a type specimen book.
            </p>
            <div className="flex items-center">
              <img
                src="/images/author.jpg"
                className="w-12 h-12 rounded-full mr-4 grayscale"
              />
              <div className="text-xl font-bold">Shu Uesugi</div>
            </div>
          </div>
        </div>
        <div className="mb-8 text-6xl md:text-7xl font-bold tracking-tighter leading-tight">
          More Stories
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 md:col-gap-16 lg:col-gap-32 row-gap-20 md:row-gap-32 mb-32">
          <div>
            <div className="-mx-5 sm:mx-0">
              <img src="/images/image.jpg" className="mb-5" />
            </div>
            <h3 className="text-3xl mb-3 leading-snug">
              Preview Mode for Static Generation
            </h3>
            <p className="text-lg mb-4">
              Contrary to popular belief, Lorem Ipsum is not simply random text.
              It has roots in a piece of classical Latin literature from 45 BC,
              making it over 2000 years old.
            </p>
            <div className="flex items-center">
              <img
                src="/images/author.jpg"
                className="w-12 h-12 rounded-full mr-4 grayscale"
              />
              <div className="text-xl font-bold">Shu Uesugi</div>
            </div>
          </div>
          <div>
            <div className="-mx-5 sm:mx-0">
              <img src="/images/image.jpg" className="mb-5" />
            </div>
            <h3 className="text-3xl mb-3 leading-snug">
              Dynamic Routing and Static Generation
            </h3>
            <p className="text-lg mb-4">
              Contrary to popular belief, Lorem Ipsum is not simply random text.
              It has roots in a piece of classical Latin literature from 45 BC,
              making it over 2000 years old.
            </p>
            <div className="flex items-center">
              <img
                src="/images/author.jpg"
                className="w-12 h-12 rounded-full mr-4 grayscale"
              />
              <div className="text-xl font-bold">Shu Uesugi</div>
            </div>
          </div>
          <div>
            <div className="-mx-5 sm:mx-0">
              <img src="/images/image.jpg" className="mb-5" />
            </div>
            <h3 className="text-3xl mb-3 leading-snug">
              Preview Mode for Static Generation
            </h3>
            <p className="text-lg mb-4">
              Contrary to popular belief, Lorem Ipsum is not simply random text.
              It has roots in a piece of classical Latin literature from 45 BC,
              making it over 2000 years old.
            </p>
            <div className="flex items-center">
              <img
                src="/images/author.jpg"
                className="w-12 h-12 rounded-full mr-4 grayscale"
              />
              <div className="text-xl font-bold">Shu Uesugi</div>
            </div>
          </div>
          <div>
            <div className="-mx-5 sm:mx-0">
              <img src="/images/image.jpg" className="mb-5" />
            </div>
            <h3 className="text-3xl mb-3 leading-snug">
              Preview Mode for Static Generation
            </h3>
            <p className="text-lg mb-4">
              Contrary to popular belief, Lorem Ipsum is not simply random text.
              It has roots in a piece of classical Latin literature from 45 BC,
              making it over 2000 years old.
            </p>
            <div className="flex items-center">
              <img
                src="/images/author.jpg"
                className="w-12 h-12 rounded-full mr-4 grayscale"
              />
              <div className="text-xl font-bold">Shu Uesugi</div>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-accent-1 border-t border-accent-2">
        <div className="container mx-auto px-5 py-28">
          <div className="flex flex-col md:flex-row items-center">
            <h3 className="text-4xl lg:text-5xl font-bold tracking-tighter leading-tight text-center md:text-left mb-10 md:mb-0 md:pr-4 md:w-1/2">
              Statically Generated with Next.js.
            </h3>
            <div className="flex flex-col md:flex-row justify-center items-center md:pl-4 md:w-1/2">
              <a
                href="https://nextjs.org/docs/basic-features/pages"
                className="mx-3 bg-black hover:bg-white hover:text-black border border-black text-white font-bold py-3 px-24 md:px-10 duration-200 transition-colors mb-6 md:mb-0"
              >
                Learn More
              </a>
              <a
                href="https://github.com/zeit/next.js/tree/canary/examples/cms-datocms"
                className="mx-3 font-bold hover:underline"
              >
                View on GitHub
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
