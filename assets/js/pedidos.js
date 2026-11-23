(() => {
    const dialog = document.querySelector('#pedido');
    if (typeof dialog?.showModal !== 'function') return;

    const photo = dialog.querySelector('.pedido-foto');
    const message = dialog.querySelector('.pedido-mensaje');
    const help = dialog.querySelector('.pedido-ayuda');
    const download = dialog.querySelector('.pedido-descarga');
    const chat = dialog.querySelector('#pedido-chat');
    const share = dialog.querySelector('#pedido-compartir');
    const manualHelp = 'Descarga la foto y adjúntala en el chat. El mensaje ya estará escrito.';
    let currentOrder = null;

    function clearOrder() {
        if (currentOrder?.photoUrl) URL.revokeObjectURL(currentOrder.photoUrl);
        currentOrder = null;
    }

    // Keep the product and price visible even if the receiving app drops the caption.
    async function makeOrderPhoto(image, name, price) {
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 640;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const scale = Math.min(680 / image.naturalWidth, 440 / image.naturalHeight);
        const width = image.naturalWidth * scale;
        const height = image.naturalHeight * scale;
        ctx.drawImage(image, (800 - width) / 2, 32 + (440 - height) / 2, width, height);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 36px sans-serif';
        ctx.fillText(name, 400, 529, 736);
        ctx.font = 'bold 42px sans-serif';
        ctx.fillStyle = '#01579b';
        ctx.fillText(price, 400, 590);
        return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.93));
    }

    async function openOrder(link) {
        clearOrder();
        const card = link.closest('.product-card, .dispensador-card');
        const image = card.querySelector('img');
        const url = new URL(link.href);
        const name = card.querySelector('h4').textContent.trim();
        const order = {
            text: url.searchParams.get('text'),
            name: card.classList.contains('jugo-card') ? 'Mía Fresh · ' + name : name
        };
        currentOrder = order;
        photo.src = image.currentSrc || image.src;
        photo.alt = image.alt;
        message.textContent = order.text;
        chat.href = link.href;
        download.href = photo.src;
        download.download = new URL(photo.src).pathname.split('/').pop();
        help.textContent = manualHelp;
        share.hidden = true;
        share.disabled = false;
        dialog.showModal();

        try {
            const price = card.querySelector('.product-price, .dispensador-price').textContent.trim();
            const blob = await makeOrderPhoto(image, order.name, price);
            if (!blob || currentOrder !== order || !dialog.open) return;

            const filename = 'Pedido Agua Mía - ' + order.name + '.jpg';
            order.photoUrl = URL.createObjectURL(blob);
            download.href = order.photoUrl;
            download.download = filename;
            if (!navigator.share || !navigator.canShare) return;
            const file = new File([blob], filename, { type: blob.type });
            if (!navigator.canShare({ files: [file] })) return;

            order.file = file;
            share.hidden = false;
            const number = url.pathname.replace(/^\/591/, '');
            help.textContent = 'Al compartir, elige WhatsApp y luego Agua Mía (' + number + ').';
        } catch {
            // A local file may be displayed but unavailable to canvas. Its download link still works.
        }
    }

    document.querySelectorAll('a[data-pedido]').forEach(link => {
        link.setAttribute('aria-haspopup', 'dialog');
        link.addEventListener('click', event => {
            if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
            event.preventDefault();
            openOrder(link);
        });
    });

    share.addEventListener('click', async () => {
        const order = currentOrder;
        if (!order?.file) return;
        share.disabled = true;
        try {
            await navigator.share({ files: [order.file], text: order.text });
        } catch (error) {
            if (currentOrder === order && error.name !== 'AbortError') {
                share.hidden = true;
                help.textContent = manualHelp;
            }
        } finally {
            if (currentOrder === order) share.disabled = false;
        }
    });

    dialog.addEventListener('close', () => {
        if (!dialog.open) clearOrder();
    });
})();
