(() => {
  'use strict';
  const artworks = Array.isArray(window.ARTWORKS) ? window.ARTWORKS : [];
  const byId = new Map(artworks.map(art => [art.id, art]));
  const $ = id => document.getElementById(id);
  const state = { query: '', medium: 'all', decade: 'all', images: 'all', sort: 'featured', view: 'gallery' };
  const featuredRows = [98, 131, 108, 92, 102, 106, 132, 20, 47, 64, 74];
  const featuredRank = new Map(featuredRows.map((row, index) => [row, index]));
  let filtered = [];
  let dialogWorks = [];
  let currentId = null;
  let returnFocus = null;
  let photoReturnFocus = null;
  let photoLoadToken = 0;
  let photoLoaded = false;
  let actualSize = false;
  let savedBodyOverflow = null;
  let photoDrag = null;

  const text = (tag, value, className) => {
    const element = document.createElement(tag);
    if (value !== undefined && value !== null) element.textContent = value;
    if (className) element.className = className;
    return element;
  };
  const mediumGroup = art => /painting/i.test(art.medium) ? 'painting' : /drawing|silkscreen|acrylic on paper/i.test(art.medium) ? 'drawing' : 'other';
  const yearNumber = art => /^\d{4}$/.test(String(art.year)) ? Number(art.year) : null;
  const yearLabel = art => art.year || 'Undated';
  const mediumLabel = art => art.medium || 'Collection record';
  const imageCount = artworks.filter(art => art.image).length;
  const localImagePath = value => typeof value === 'string' && value.length > 0 &&
    !/^(?:[a-z][\w+.-]*:|[\/\\])/i.test(value) &&
    !value.split(/[\/\\]/).includes('..') ? value : '';

  function placeholder(message = 'No image available') {
    const element = text('span', '', 'placeholder');
    element.append(text('span', 'TZ', 'placeholder-mark'), text('span', message));
    return element;
  }

  function addImage(container, art, { full = false, eager = false } = {}) {
    const original = localImagePath(art.image);
    const thumbnail = localImagePath(art.thumbnail);
    if (!original) {
      container.classList.add('has-no-image');
      const empty = placeholder();
      empty.append(text('small', 'Collection record'));
      container.append(empty);
      return;
    }
    const img = document.createElement('img');
    img.alt = art.title;
    img.loading = eager ? 'eager' : 'lazy';
    img.decoding = 'async';
    img.src = full ? original : (thumbnail || original);
    let triedOriginal = full || !thumbnail;
    img.addEventListener('error', () => {
      if (!triedOriginal) {
        triedOriginal = true;
        img.src = original;
      } else {
        container.classList.add('has-no-image');
        img.remove();
        container.append(placeholder('Image unavailable'));
      }
    });
    container.append(img);
  }

  function renderHero() {
    const art = artworks.find(item => item.row === featuredRows[0] && item.image) || artworks.find(item => item.image);
    if (!art) return;
    const button = text('button', '', 'hero-piece');
    button.type = 'button';
    button.setAttribute('aria-label', `View ${art.title}, ${yearLabel(art)}`);
    const surface = text('span', '', 'hero-image-surface');
    addImage(surface, art, { full: true, eager: true });
    const caption = text('span', '', 'hero-piece-caption');
    const title = text('span');
    title.append(text('strong', art.title), text('span', art.year, 'caption-year'));
    const arrow = text('span', '↗', 'open-icon');
    arrow.setAttribute('aria-hidden', 'true');
    caption.append(title, arrow);
    button.append(surface, caption);
    button.addEventListener('click', () => openArtwork(art.id, button));
    $('heroArt').append(button);
  }

  function filterAndSort() {
    const terms = state.query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    filtered = artworks.filter(art => {
      if (state.medium !== 'all' && mediumGroup(art) !== state.medium) return false;
      const year = yearNumber(art);
      if (state.decade === 'undated' && year !== null) return false;
      if (state.decade !== 'all' && state.decade !== 'undated' && Math.floor(year / 10) * 10 !== Number(state.decade)) return false;
      if (state.images === 'with' && !art.image) return false;
      if (state.images === 'without' && art.image) return false;
      const searchable = `${art.title} ${art.year} ${art.medium}`.toLowerCase();
      return terms.every(term => searchable.includes(term));
    });
    filtered.sort((a, b) => {
      if (state.sort === 'title') return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' });
      if (state.sort === 'featured') {
        const rank = (featuredRank.get(a.row) ?? 1000) - (featuredRank.get(b.row) ?? 1000);
        return rank || a.row - b.row;
      }
      const ya = yearNumber(a), yb = yearNumber(b);
      if (ya === null && yb === null) return a.row - b.row;
      if (ya === null) return 1;
      if (yb === null) return -1;
      return (state.sort === 'year-desc' ? yb - ya : ya - yb) || a.row - b.row;
    });
  }

  function cardFor(art, index) {
    const button = text('button', '', 'art-card');
    button.type = 'button';
    button.setAttribute('aria-label', `View ${art.title}, ${yearLabel(art)}`);
    const imageWrap = text('span', '', 'art-image-wrap');
    addImage(imageWrap, art, { eager: index < 8 });
    const top = text('span', '', 'card-topline');
    top.append(text('span', art.title, 'card-title'), text('span', yearLabel(art), 'card-year'));
    button.append(imageWrap, top, text('span', mediumLabel(art), 'card-medium'));
    button.addEventListener('click', () => openArtwork(art.id, button));
    return button;
  }

  function renderTable() {
    const wrapper = text('div', '', 'table-container');
    const table = text('table', '', 'artwork-table');
    const caption = text('caption', 'Artwork catalogue. Select a title to view artwork details.', 'sr-only');
    const head = document.createElement('thead');
    const headRow = document.createElement('tr');
    ['Image', 'Artwork', 'Year', 'Medium', 'Dimensions', ''].forEach(label => {
      const th = text('th', label);
      th.scope = 'col';
      if (!label) th.setAttribute('aria-label', 'View details');
      headRow.append(th);
    });
    head.append(headRow);
    const body = document.createElement('tbody');
    filtered.forEach(art => {
      const row = document.createElement('tr');
      const imageCell = document.createElement('td');
      const thumb = text('button', '', 'table-thumbnail');
      thumb.type = 'button';
      thumb.tabIndex = -1;
      thumb.setAttribute('aria-label', `View ${art.title}`);
      if (art.image) addImage(thumb, art);
      else thumb.append(text('span', '—', 'table-record'));
      thumb.addEventListener('click', () => openArtwork(art.id, thumb));
      imageCell.append(thumb);
      const titleCell = document.createElement('td');
      const title = text('button', art.title, 'table-title');
      title.type = 'button';
      title.addEventListener('click', () => openArtwork(art.id, title));
      titleCell.append(title);
      const finalCell = document.createElement('td');
      const open = text('button', '↗', 'table-open');
      open.type = 'button';
      open.tabIndex = -1;
      open.setAttribute('aria-label', `View ${art.title}`);
      open.addEventListener('click', () => openArtwork(art.id, open));
      finalCell.append(open);
      row.append(imageCell, titleCell, text('td', yearLabel(art)), text('td', mediumLabel(art)), text('td', art.dimensions || '—'), finalCell);
      body.append(row);
    });
    table.append(caption, head, body);
    wrapper.append(table);
    return wrapper;
  }

  function render() {
    filterAndSort();
    const host = $('artworks');
    host.replaceChildren();
    host.className = state.view === 'gallery' ? 'artwork-grid' : '';
    if (state.view === 'gallery') filtered.forEach((art, index) => host.append(cardFor(art, index)));
    else if (filtered.length) host.append(renderTable());
    $('emptyState').hidden = filtered.length !== 0;
    $('resultsCount').textContent = `Showing ${filtered.length} of ${artworks.length} records`;
    $('resetFilters').hidden = !state.query && state.medium === 'all' && state.decade === 'all' && state.images === 'all';
    document.querySelectorAll('[data-medium]').forEach(button => {
      const active = button.dataset.medium === state.medium;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    $('galleryView').setAttribute('aria-pressed', String(state.view === 'gallery'));
    $('tableView').setAttribute('aria-pressed', String(state.view === 'table'));
  }

  function resetFilters() {
    state.query = ''; state.medium = 'all'; state.decade = 'all'; state.images = 'all';
    $('search').value = ''; $('decade').value = 'all'; $('images').value = 'all';
    render();
  }

  function renderDetail(art) {
    currentId = art.id;
    $('detailTitle').textContent = art.title;
    $('detailMedium').textContent = mediumLabel(art);
    $('detailYear').textContent = yearLabel(art);
    const imageHost = $('detailImage');
    const restoreImageFocus = imageHost.contains(document.activeElement);
    imageHost.replaceChildren();
    imageHost.classList.remove('has-no-image');
    const hasPhoto = Boolean(localImagePath(art.largeImage) || localImagePath(art.image));
    if (hasPhoto) {
      const photoButton = text('button', '', 'detail-image-button');
      photoButton.type = 'button';
      photoButton.setAttribute('aria-label', `View larger photo of ${art.title}`);
      photoButton.setAttribute('aria-haspopup', 'dialog');
      photoButton.setAttribute('aria-controls', 'photoDialog');
      addImage(photoButton, art, { full: true, eager: true });
      photoButton.append(text('span', 'View larger photo ↗', 'detail-image-hint'));
      photoButton.addEventListener('click', () => openPhoto(art, photoButton));
      imageHost.append(photoButton);
    } else {
      addImage(imageHost, art, { full: true, eager: true });
    }
    const metadata = $('detailMetadata');
    metadata.replaceChildren();
    const pairs = [['Dimensions', art.dimensions], ['Date', art.date], ['Image filename', art.filename]];
    pairs.forEach(([label, value]) => {
      if (!value) return;
      const item = text('div', '', `metadata-item${label === 'Image filename' ? ' filename' : ''}`);
      item.append(text('dt', label), text('dd', value));
      metadata.append(item);
    });
    metadata.hidden = !metadata.children.length;
    const review = $('detailReview');
    review.replaceChildren();
    review.hidden = !art.reviewNote;
    if (art.reviewNote) review.append(text('strong', 'Catalogue note'), document.createTextNode(art.reviewNote));
    $('viewLargerPhoto').hidden = !hasPhoto;
    const position = dialogWorks.findIndex(item => item.id === art.id);
    $('detailPosition').textContent = `${position + 1} / ${dialogWorks.length}`;
    $('previousWork').disabled = position <= 0;
    $('nextWork').disabled = position >= dialogWorks.length - 1;
    $('artworkDialog').scrollTop = 0;
    if (restoreImageFocus) (imageHost.querySelector('button') || $('closeDialog')).focus({ preventScroll: true });
  }

  function openArtwork(id, trigger) {
    const art = byId.get(id);
    if (!art) return;
    returnFocus = trigger || document.activeElement;
    dialogWorks = filtered.some(item => item.id === id) ? filtered.slice() : artworks.slice();
    renderDetail(art);
    const dialog = $('artworkDialog');
    if (!dialog.open) dialog.showModal();
    syncScrollLock();
    $('closeDialog').focus({ preventScroll: true });
  }

  function stepDetail(direction) {
    if ($('photoDialog').open) return;
    const index = dialogWorks.findIndex(art => art.id === currentId);
    const next = dialogWorks[index + direction];
    if (next) renderDetail(next);
  }

  function syncScrollLock() {
    if ($('artworkDialog').open || $('photoDialog').open) {
      if (savedBodyOverflow === null) savedBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    } else if (savedBodyOverflow !== null) {
      document.body.style.overflow = savedBodyOverflow;
      savedBodyOverflow = null;
    }
  }

  function setPhotoSize(zoomed) {
    actualSize = zoomed && photoLoaded;
    $('photoDialog').classList.toggle('is-actual-size', actualSize);
    $('photoZoom').textContent = actualSize ? 'Fit to screen' : 'Actual size';
    $('photoZoom').setAttribute('aria-pressed', String(actualSize));
    $('photoViewport').scrollLeft = 0;
    $('photoViewport').scrollTop = 0;
  }

  function openPhoto(art, trigger) {
    if (!art) return;
    const preferred = localImagePath(art.largeImage) || localImagePath(art.image);
    const fallback = localImagePath(art.image);
    const viewer = $('photoDialog');
    const canvas = $('photoCanvas');
    const status = $('photoStatus');
    const token = ++photoLoadToken;
    photoReturnFocus = trigger || document.activeElement;
    photoLoaded = false;
    photoDrag = null;
    viewer.classList.remove('is-dragging');
    setPhotoSize(false);
    $('photoTitle').textContent = art.title;
    $('photoYear').textContent = yearLabel(art);
    $('photoZoom').disabled = true;
    $('photoViewport').setAttribute('aria-label', `Photograph of ${art.title}`);
    $('photoViewport').setAttribute('aria-busy', 'true');
    $('photoHelp').textContent = 'Choose Actual size to look closer. Scroll, drag or swipe to move around the photo.';
    canvas.replaceChildren();
    canvas.hidden = true;
    status.hidden = false;
    status.textContent = preferred ? 'Loading photo…' : 'No photo is available for this artwork.';
    if (!viewer.open) viewer.showModal();
    syncScrollLock();
    $('closePhoto').focus({ preventScroll: true });
    if (!preferred) {
      $('photoViewport').setAttribute('aria-busy', 'false');
      $('photoHelp').textContent = 'Close this view to return to the artwork details.';
      return;
    }
    const img = document.createElement('img');
    img.alt = art.title;
    img.decoding = 'async';
    img.draggable = false;
    let usedFallback = false;
    img.addEventListener('load', () => {
      if (token !== photoLoadToken || !viewer.open) return;
      photoLoaded = true;
      img.width = img.naturalWidth;
      img.height = img.naturalHeight;
      status.hidden = true;
      canvas.hidden = false;
      $('photoViewport').setAttribute('aria-busy', 'false');
      $('photoZoom').disabled = false;
      if (usedFallback) $('photoHelp').textContent = 'The larger photo is unavailable. Showing the standard photo; choose Actual size to inspect it.';
    });
    img.addEventListener('error', () => {
      if (token !== photoLoadToken || !viewer.open) return;
      if (!usedFallback && fallback && fallback !== preferred) {
        usedFallback = true;
        img.src = fallback;
        return;
      }
      img.remove();
      canvas.hidden = true;
      status.hidden = false;
      status.textContent = 'This photo could not be loaded.';
      $('photoViewport').setAttribute('aria-busy', 'false');
      $('photoHelp').textContent = 'Close this view to return to the artwork details.';
    });
    canvas.append(img);
    // The larger asset is requested only after this viewer is opened.
    img.src = preferred;
  }

  $('heroCount').replaceChildren(document.createTextNode(`${artworks.length} records `), text('span', '·'), document.createTextNode(` ${imageCount} images`));
  $('collectionTotal').textContent = `${artworks.length} records`;
  $('countAll').textContent = artworks.length;
  $('countPaintings').textContent = artworks.filter(art => mediumGroup(art) === 'painting').length;
  $('countDrawings').textContent = artworks.filter(art => mediumGroup(art) === 'drawing').length;
  const decades = [...new Set(artworks.map(yearNumber).filter(year => year !== null).map(year => Math.floor(year / 10) * 10))].sort((a, b) => a - b);
  decades.forEach(decade => { const option = text('option', `${decade}s`); option.value = String(decade); $('decade').append(option); });
  if (artworks.some(art => yearNumber(art) === null)) { const option = text('option', 'Undated'); option.value = 'undated'; $('decade').append(option); }
  $('search').addEventListener('input', event => { state.query = event.target.value; render(); });
  document.querySelectorAll('[data-medium]').forEach(button => button.addEventListener('click', () => { state.medium = button.dataset.medium; render(); }));
  ['decade', 'images', 'sort'].forEach(key => $(key).addEventListener('change', event => { state[key] = event.target.value; render(); }));
  $('galleryView').addEventListener('click', () => { state.view = 'gallery'; render(); });
  $('tableView').addEventListener('click', () => { state.view = 'table'; render(); });
  $('resetFilters').addEventListener('click', resetFilters);
  $('emptyReset').addEventListener('click', resetFilters);
  $('closeDialog').addEventListener('click', () => $('artworkDialog').close());
  $('viewLargerPhoto').addEventListener('click', event => openPhoto(byId.get(currentId), event.currentTarget));
  $('closePhoto').addEventListener('click', () => $('photoDialog').close());
  $('photoZoom').addEventListener('click', () => setPhotoSize(!actualSize));
  $('photoDialog').addEventListener('cancel', event => {
    event.preventDefault();
    event.stopPropagation();
    $('photoDialog').close();
  });
  $('photoDialog').addEventListener('close', () => {
    ++photoLoadToken;
    photoLoaded = false;
    photoDrag = null;
    $('photoDialog').classList.remove('is-dragging');
    $('photoCanvas').replaceChildren();
    setPhotoSize(false);
    syncScrollLock();
    if ($('artworkDialog').open && photoReturnFocus?.isConnected) photoReturnFocus.focus({ preventScroll: true });
  });
  const viewport = $('photoViewport');
  viewport.addEventListener('pointerdown', event => {
    if (!actualSize || event.pointerType !== 'mouse' || event.button !== 0) return;
    photoDrag = { pointer: event.pointerId, x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop };
    viewport.setPointerCapture(event.pointerId);
    $('photoDialog').classList.add('is-dragging');
    viewport.focus({ preventScroll: true });
    event.preventDefault();
  });
  viewport.addEventListener('pointermove', event => {
    if (!photoDrag || event.pointerId !== photoDrag.pointer) return;
    viewport.scrollLeft = photoDrag.left + photoDrag.x - event.clientX;
    viewport.scrollTop = photoDrag.top + photoDrag.y - event.clientY;
  });
  const finishPhotoDrag = () => {
    photoDrag = null;
    $('photoDialog').classList.remove('is-dragging');
  };
  viewport.addEventListener('pointerup', finishPhotoDrag);
  viewport.addEventListener('pointercancel', finishPhotoDrag);
  viewport.addEventListener('lostpointercapture', finishPhotoDrag);
  $('previousWork').addEventListener('click', () => stepDetail(-1));
  $('nextWork').addEventListener('click', () => stepDetail(1));
  $('artworkDialog').addEventListener('keydown', event => {
    if ($('photoDialog').open) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); stepDetail(event.key === 'ArrowLeft' ? -1 : 1); }
  });
  $('artworkDialog').addEventListener('click', event => {
    if (event.target !== $('artworkDialog')) return;
    const bounds = $('artworkDialog').getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) $('artworkDialog').close();
  });
  $('artworkDialog').addEventListener('close', () => {
    if ($('photoDialog').open) $('photoDialog').close();
    syncScrollLock();
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  });
  renderHero();
  render();
})();
