/* globals Image, document, module */
const Promise = require('bluebird')

module.exports = function getDataUri(url) {
    const image = new Image();

    return new Promise(function(Y,N){
        image.onload = function () {
            let canvas = document.createElement('canvas');
            canvas.width = this.naturalWidth;
            canvas.height = this.naturalHeight;

            canvas.getContext('2d').drawImage(this, 0, 0);

            return Y(canvas.toDataURL('image/png'));
        };

        image.onerror = N

        image.src = url
    })
}