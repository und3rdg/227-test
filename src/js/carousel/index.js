import Glide from '@glidejs/glide'

export const glide = new Glide('.glide', {
    type: 'carousel',
    keyboard: true,
    rewind: true,
    autoplay: 2000,
    hoverpause: true,
    perView: 5,
    breakpoints: {
        1200: {
            perView: 4,
        },
        600: {
            perView: 3,
        },
        400: {
            perView: 2,
        },
    },
})
