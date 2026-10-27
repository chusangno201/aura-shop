import {useShopRoute} from './use-shop-route.js';
import {LanguageProvider,LanguageSwitch,useLanguage,translateValue} from './i18n';
import React, { useEffect, useRef, useState } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { consent, track, custom, productData } from './pixel';
import { shopConfig } from './shop-config';
import { categories, filterProducts } from './catalog';
import './style.css';
const money = n => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND'
}).format(n);
const read = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};
const readCart = () => {
  const c = read('aura-cart', []);
  return Array.isArray(c) ? c.filter(i => typeof i.id === 'string' && Number.isInteger(i.quantity) && i.quantity > 0 && i.quantity <= 20) : [];
};
function Icon({
  name,
  ...props
}) {
  const {
    t
  } = useLanguage();
  const paths = {
    bag: <><path d="M5 7h14l1 14H4L5 7Z" /><path d="M8 8V6a4 4 0 0 1 8 0v2" /></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
    arrow: <><path d="M4 12h16M14 6l6 6-6 6" /></>,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    check: <path d="m5 12 4 4L19 6" />,
    truck: <><path d="M2 5h12v12H2zM14 9h4l4 5v3h-8" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="18" r="2" /></>
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{translateValue(paths[name] || paths.arrow, t)}</svg>;
}
function SocialLinks() {
  const {
    t
  } = useLanguage();
  return <div className="social-links">{translateValue(Object.entries({
      facebook: 'Facebook',
      instagram: 'Instagram',
      tiktok: 'TikTok',
      website: 'Website'
    }).map(([key, label]) => {
      let url;
      try {
        url = new URL(shopConfig.socials[key]);
        if (url.protocol !== 'https:') url = null;
      } catch {}
      return url ? <a key={key} href={url.href} target="_blank" rel="noopener noreferrer">{translateValue(label, t)}<span></span></a> : <span className="social-pending" key={key}>{translateValue(label, t)}</span>;
    }), t)}</div>;
}
function Dialog({
  children,
  onClose,
  label,
  busy,
  drawer
}) {
  const {
    t
  } = useLanguage();
  const ref = useRef(null);
  useEffect(() => {
    const prior = document.activeElement;
    const style = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const el = ref.current;
    el.focus();
    const key = e => {
      if (e.key === 'Escape' && !busy) onClose();
      if (e.key === 'Tab') {
        const nodes = [...el.querySelectorAll('button:not(:disabled),a[href],input,select,textarea,[tabindex="0"]')].filter(n => n.getClientRects().length);
        if (!nodes.length) {
          e.preventDefault();
          return;
        }
        const first = nodes[0],
          last = nodes.at(-1);
        if (e.shiftKey && (document.activeElement === first || document.activeElement === el)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && (document.activeElement === last || document.activeElement === el)) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.body.style.overflow = style;
      document.removeEventListener('keydown', key);
      prior?.focus();
    };
  }, [busy]);
  return <div className="overlay" onClick={e => {
    if (e.target === e.currentTarget && !busy) onClose();
  }}><section ref={ref} tabIndex={-1} className={'dialog ' + (drawer ? 'drawer' : '')} role="dialog" aria-modal="true" aria-label={translateValue(label, t)}><button className="close icon-button" disabled={busy} onClick={onClose} aria-label={t("Đóng")}><Icon name="close" /></button>{translateValue(children, t)}</section></div>;
}
function Shop() {
  const {
    t
  } = useLanguage();
  const [storageReady, setStorageReady] = useState(false);
  const [products, setProducts] = useState([]),
    [cart, setCart] = useState([]),
    [favorites, setFavorites] = useState([]),
    [category, setCategory] = useState('Tất cả'),
    [search, setSearch] = useState(''),
    [sort, setSort] = useState('featured'),
    [onlyFavorites, setOnlyFavorites] = useState(false),
    [modal,setModal]=useShopRoute(products,p=>setSelected(p)),
    [selected, setSelected] = useState(null),
    [cookie, setCookie] = useState(false),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [order, setOrder] = useState(null),
    [toast, setToast] = useState('');
  const key = useRef(null),
    lock = useRef(false),
    searchRef = useRef(null);
  useEffect(() => {
    setCart(readCart());
    const saved = read('aura-favorites', []);
    setFavorites(Array.isArray(saved) ? saved : []);
    setCookie(!localStorage.getItem('aura-consent'));
    setStorageReady(true);
    fetch('/api/products').then(r => {
      if (!r.ok) throw Error();
      return r.json();
    }).then(setProducts).catch(() => setError('Chưa tải được sản phẩm. Vui lòng kiểm tra máy chủ và tải lại.')).finally(() => setLoading(false));
    if (localStorage.getItem('aura-consent') === 'yes') consent(true);
  }, []);
  useEffect(() => {
    if (storageReady) localStorage.setItem('aura-cart', JSON.stringify(cart));
  }, [cart, storageReady]);
  useEffect(() => {
    if (storageReady) localStorage.setItem('aura-favorites', JSON.stringify(favorites));
  }, [favorites, storageReady]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2500);
    return () => clearTimeout(t);
  }, [toast]);
  const lines = cart.map(i => ({
      ...products.find(p => p.id === i.id),
      quantity: i.quantity
    })).filter(i => i.id),
    count = lines.reduce((s, i) => s + i.quantity, 0),
    subtotal = lines.reduce((s, i) => s + i.price * i.quantity, 0),
    shipping = subtotal >= 1000000 ? 0 : 30000;
  const list = filterProducts(products, category, search, sort).filter(p => !onlyFavorites || favorites.includes(p.id));
  function browse(c) {
    setCategory(c);
    setOnlyFavorites(false);
    setSearch('');
    document.getElementById('shop').scrollIntoView({
      behavior: 'smooth'
    });
  }
  function view(p) {
    setSelected(p);
    setModal('product',p.id);
    track('ViewContent', productData(p));
  }
  function favorite(p) {
    setFavorites(a => a.includes(p.id) ? a.filter(id => id !== p.id) : [...a, p.id]);
  }
  function add(p, open = true) {
    if ((cart.find(i => i.id === p.id)?.quantity || 0) >= 20) {
      setToast('Tối đa 20 sản phẩm cho mỗi mã.');
      return;
    }
    setCart(c => c.some(i => i.id === p.id) ? c.map(i => i.id === p.id ? {
      ...i,
      quantity: i.quantity + 1
    } : i) : [...c, {
      id: p.id,
      quantity: 1
    }]);
    track('AddToCart', productData(p));
    if (open) setModal('cart');else setToast('Đã thêm ' + p.id + ' vào giỏ hàng');
  }
  function checkout() {
    setError('');
    key.current = crypto.randomUUID();
    setModal('checkout');
    track('InitiateCheckout', {
      value: subtotal + shipping,
      currency: 'VND',
      contents: lines.map(i => ({
        id: i.id,
        quantity: i.quantity
      })),
      content_type: 'product'
    });
  }
  async function submit(e) {
    e.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    const customer = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': key.current
        },
        body: JSON.stringify({
          items: lines.map(i => ({
            id: i.id,
            quantity: i.quantity
          })),
          customer
        })
      });
      const result = await res.json();
      if (!res.ok) throw Error(result.error);
      const data = {
        value: result.total,
        currency: 'VND',
        contents: lines.map(i => ({
          id: i.id,
          quantity: i.quantity
        })),
        content_type: 'product',
        order_id: result.id
      };
      if (!sessionStorage.getItem(result.id)) {
        custom('OrderPlaced', data);
        if (import.meta.env.VITE_TRACK_COD_PURCHASE === 'true') track('Purchase', data, result.id);
        sessionStorage.setItem(result.id, '1');
      }
      setOrder(result);
      setCart([]);
      setModal('success');
    } catch (e) {
      setError(e.message || 'Không gửi được đơn. Hãy thử lại.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function Card({
    p
  }) {
    const {
      t
    } = useLanguage();
    return <article className="product-card"><div className="product-photo"><button className="photo-link" aria-label={translateValue('Xem ' + p.name, t)} onClick={() => view(p)}><img sizes="(max-width:760px) calc(45vw - 24px), (max-width:1400px) 22vw, 320px" {...auraImageSet(p.image)} src={p.image} alt={translateValue(p.name, t)} loading="lazy" width="600" height="600" /></button><span className="tag">{translateValue(p.category === 'Áo' ? 'THE SOFT EDIT' : 'EVERYDAY BAGS', t)}</span><button className={'save icon-button ' + (favorites.includes(p.id) ? 'saved' : '')} aria-label={translateValue((favorites.includes(p.id) ? 'Bỏ lưu ' : 'Lưu ') + p.name, t)} aria-pressed={favorites.includes(p.id)} onClick={() => favorite(p)}><Icon name="heart" /></button><button className="quick-view" onClick={() => view(p)}>{t("Xem chi tiết ")}<Icon name="arrow" /></button></div><div className="product-info"><span className="sku">{translateValue(p.id, t)}</span><button className="product-name" onClick={() => view(p)}>{translateValue(p.name, t)}</button><div className="product-bottom"><b>{translateValue(money(p.price), t)}</b><button className="add-button" onClick={() => add(p, false)} aria-label={translateValue('Thêm ' + p.name + ' vào giỏ', t)}><Icon name="bag" /><span>{t("Thêm vào giỏ")}</span></button></div></div></article>;
  }
  return <><a className="skip-link" href="#shop">{t("Đến sản phẩm")}</a><div className="announcement">{t("MIỄN PHÍ GIAO HÀNG TỪ 1.000.000₫ ")}<span>{t("·")}</span>{t(" THANH TOÁN KHI NHẬN HÀNG")}</div>
 <header><a className="brand" href="#" aria-label={t("AURA L’AMOUR trang chủ")}>{t("AURA L’AMOUR")}<span>{t("CURATED WITH LOVE")}</span></a><nav aria-label={t("Danh mục chính")}><button onClick={() => browse('Tất cả')}>{t("Bộ sưu tập")}</button><button onClick={() => browse('Áo')}>{t("Áo")}</button><button onClick={() => browse('Túi')}>{t("Túi")}</button><a href="#style-edit">{t("Gợi ý phối đồ")}</a></nav><div className="header-actions"><LanguageSwitch/><button className="icon-button desktop-search" aria-label={t("Tìm kiếm")} onClick={() => {
          document.getElementById('shop').scrollIntoView({
            behavior: 'smooth'
          });
          searchRef.current?.focus();
        }}><Icon name="search" /></button><button className="icon-button" aria-label={t("Sản phẩm đã lưu")} onClick={() => {
          setOnlyFavorites(true);
          setCategory('Tất cả');
          setSearch('');
          document.getElementById('shop').scrollIntoView({
            behavior: 'smooth'
          });
        }}><Icon name="heart" /></button><button className="cart-trigger icon-button" aria-label={translateValue('Giỏ hàng ' + count + ' sản phẩm', t)} onClick={() => setModal('cart')}><Icon name="bag" /><span>{translateValue(count, t)}</span></button></div></header>
 <main><section className="hero"><div className="hero-copy"><span className="eyebrow"><i />{t(" LITTLE THINGS, LOVELY DAYS")}</span><h1>{t("Chạm một chút xinh.")}<br />{t("Yêu cả ")}<em>{t("ngày dài.")}</em></h1><p>{t("Một chiếc áo dịu dàng, một chiếc túi vừa ý.")}<br />{t("Tìm những món đồ khiến bạn muốn diện mỗi ngày.")}</p><div className="hero-buttons"><button className="dark" onClick={() => browse('Tất cả')}>{t("Khám phá bộ sưu tập ")}<Icon name="arrow" /></button><button className="underlined" onClick={() => browse('Áo')}>{t("Xem áo từ 185.000₫ ")}</button></div><div className="hero-note"><span>{t("01 — 05")}</span><span>{t("5 LỰA CHỌN · THE EVERYDAY EDIT")}</span></div></div><div className="hero-art hero-editorial">
    <img src="/images/aura-model-1-800.webp" srcSet="/images/aura-model-1-480.webp 480w, /images/aura-model-1-640.webp 640w, /images/aura-model-1-800.webp 800w, /images/aura-model-1-1200.webp 1200w" sizes="(max-width:760px) 100vw, 50vw" width="960" height="1280" alt={t("Gợi ý phối áo dệt trắng cùng chân váy nâu")} fetchPriority="high" decoding="async" />
    <div className="editorial-caption">
      <span>{t("THE EVERYDAY MUSE")}</span>
      <strong>{t("Mặc điều mình yêu.")}</strong>
      <button className="dark" onClick={() => browse('Áo')}>{t("Khám phá bộ sưu tập áo")}</button>
    </div>
  </div></section>
 <section className="service-strip" aria-label={t("Thông tin mua sắm")}><div><Icon name="truck" /><span>{t("Giao hàng toàn quốc")}<small>{t("Miễn phí từ 1.000.000₫")}</small></span></div><div><Icon name="bag" /><span>{t("Mua sắm đơn giản")}<small>{t("Đặt hàng COD ngay trên web")}</small></span></div><div><Icon name="heart" /><span>{t("Chọn theo cách của bạn")}<small>{t("Lưu lại món đồ yêu thích")}</small></span></div></section>
 <section className="category-section"><div className="section-head"><div><span className="eyebrow">{t("YOUR EVERYDAY WARDROBE")}</span><h2>{t("Hôm nay, bạn chọn gì?")}</h2></div><span className="section-aside">{t("Ít lựa chọn hơn. Dễ tìm món yêu hơn.")}</span></div><div className="category-grid"><button className="category-card clothes" onClick={() => browse('Áo')}><div><span className="eyebrow">{t("THE SOFT EDIT")}</span><h3>{t("Áo xinh,")}<br />{t("ngày nhẹ tênh.")}</h3><span className="category-cta">{t("Khám phá Áo ")}<Icon name="arrow" /></span></div><img sizes="(max-width:760px) 32vw, (max-width:1400px) 20vw, 280px" {...auraImageSet("/images/au1.webp")} src="/images/au1.webp" alt={t("Bộ sưu tập áo")} loading="lazy" /></button></div></section>
 <section className="catalog" id="shop"><div className="section-head"><div><span className="eyebrow">{t("PICK YOUR FAVORITES")}</span><h2>{translateValue(onlyFavorites ? 'Những món bạn đã lưu' : 'Một chút xinh dành cho bạn', t)}</h2></div><span className="section-aside">{translateValue(list.length, t)}{t(" sản phẩm")}</span></div><div className="toolbar"><div className="tabs" aria-label={t("Lọc danh mục")}>{translateValue(categories.map(c => <button aria-pressed={category === c && !onlyFavorites} className={category === c && !onlyFavorites ? 'active' : ''} key={c} onClick={() => {
              setCategory(c);
              setOnlyFavorites(false);
            }}>{translateValue(c, t)}<span>{translateValue(c === 'Tất cả' ? products.length : products.filter(p => p.category === c).length, t)}</span></button>), t)}<button className={onlyFavorites ? 'active' : ''} aria-pressed={onlyFavorites} onClick={() => setOnlyFavorites(v => !v)}>{t("Đã lưu ♡")}</button></div><div className="filters"><label className="search-box"><Icon name="search" /><input ref={searchRef} aria-label={t("Tìm tên hoặc mã sản phẩm")} placeholder={t("Tìm tên hoặc mã sản phẩm")} value={search} onChange={e => setSearch(e.target.value)} /></label><select aria-label={t("Sắp xếp sản phẩm")} value={sort} onChange={e => setSort(e.target.value)}><option value="featured">{t("Gợi ý cho bạn")}</option><option value="low">{t("Giá: thấp đến cao")}</option><option value="high">{t("Giá: cao đến thấp")}</option></select></div></div>{translateValue(error && !modal && <p className="error" role="alert">{translateValue(error, t)}</p>, t)}{translateValue(loading ? <div className="empty-state">{t("Đang chuẩn bị những món xinh cho bạn…")}</div> : <div className="grid">{translateValue(list.map(p => <Card p={p} key={p.id} />), t)}</div>, t)}{translateValue(!loading && !list.length && <div className="empty-state"><Icon name="search" /><h3>{translateValue(onlyFavorites ? 'Bạn chưa lưu sản phẩm nào' : 'Chưa tìm thấy món đồ phù hợp', t)}</h3><p>{t("Thử bỏ bộ lọc hoặc tìm theo mã sản phẩm.")}</p><button className="dark" onClick={() => {
            setSearch('');
            setCategory('Tất cả');
            setOnlyFavorites(false);
          }}>{t("Xem tất cả sản phẩm ")}<Icon name="arrow" /></button></div>, t)}</section>
 <section className="style-edit" id="style-edit"><div className="style-image"><img sizes="(max-width: 760px) 88vw, 600px" {...auraImageSet("/images/au5.webp")} src="/images/au5.webp" alt={t("Gợi ý trang phục mềm mại từ AURA")} loading="lazy" /></div><div className="style-copy"><span className="eyebrow">{t("THE AURA STYLE NOTE / 01")}</span><h2>{t("Một chiếc túi.")}<br />{t("Nhiều cách ")}<em>{t("là bạn.")}</em></h2><p>{t("Áo sáng màu cùng túi nhỏ cho buổi cà phê. Một bộ đồ mềm mại và chiếc túi thanh lịch cho cuộc hẹn tối. Bắt đầu từ món đồ bạn yêu, rồi phối theo cách riêng.")}</p><button className="dark" onClick={() => browse('Túi')}>{t("Tìm chiếc túi đi cùng bạn ")}<Icon name="arrow" /></button><button className="underlined" onClick={() => browse('Áo')}>{t("Khám phá những mẫu áo ")}</button></div></section>
 
<section className="aura-lookbook" aria-label={t("Gợi ý phối đồ")}>
  <div className="section-head">
    <div><span className="eyebrow">{t("THE AURA JOURNAL")}</span>
    <h2>{t("Một chút cảm hứng mỗi ngày.")}</h2></div>
  </div>
  <div className="lookbook-grid">
    <figure><img src="/images/aura-model-1-800.webp" srcSet="/images/aura-model-1-480.webp 480w, /images/aura-model-1-640.webp 640w, /images/aura-model-1-800.webp 800w, /images/aura-model-1-1200.webp 1200w" sizes="(max-width:760px) 90vw, 30vw" width="960" height="1280" alt={t("Áo dệt trắng phối chân váy nâu")} loading="lazy" decoding="async" />
      <figcaption><span>{t("01 / CITY DAYS")}</span><h3>{t("Dịu dàng giữa phố.")}</h3></figcaption>
    </figure>
    <figure><img src="/images/aura-model-2-800.webp" srcSet="/images/aura-model-2-480.webp 480w, /images/aura-model-2-640.webp 640w, /images/aura-model-2-800.webp 800w, /images/aura-model-2-1200.webp 1200w" sizes="(max-width:760px) 90vw, 30vw" width="960" height="1280" alt={t("Gợi ý phối áo trắng và mũ đan")} loading="lazy" decoding="async" />
      <figcaption><span>{t("02 / SOFT DETAILS")}</span><h3>{t("Xinh từ điều nhỏ.")}</h3></figcaption>
    </figure>
    <figure><img src="/images/aura-model-3-800.webp" srcSet="/images/aura-model-3-480.webp 480w, /images/aura-model-3-640.webp 640w, /images/aura-model-3-800.webp 800w, /images/aura-model-3-1200.webp 1200w" sizes="(max-width:760px) 90vw, 30vw" width="960" height="1280" alt={t("Trang phục trắng trong chuyến đi ngoài trời")} loading="lazy" decoding="async" />
      <figcaption><span>{t("03 / SLOW WEEKENDS")}</span><h3>{t("Mang yêu thương đi xa.")}</h3></figcaption>
    </figure>
  </div>
</section>
<section className="faq-section"><div><span className="eyebrow">{t("LET’S MAKE IT SIMPLE")}</span><h2>{t("Trước khi bạn đặt hàng")}</h2><p>{t("Một vài thông tin để bạn chọn mua dễ dàng hơn.")}</p></div><div className="faq-list"><details><summary>{t("Mua hàng trên website như thế nào?")}</summary><p>{t("Chọn sản phẩm, thêm vào giỏ rồi điền thông tin nhận hàng. Đơn được lưu trên hệ thống; shop sẽ liên hệ xác nhận trước khi giao. Bạn thanh toán khi nhận hàng (COD).")}</p></details><details><summary>{t("Phí giao hàng được tính ra sao?")}</summary><p>{t("Phí giao hàng 30.000₫ cho đơn dưới 1.000.000₫. Đơn từ 1.000.000₫ được miễn phí giao hàng. Tổng tiền luôn hiển thị trước khi bạn xác nhận.")}</p></details><details><summary>{t("Tôi muốn chọn màu hoặc size thì sao?")}</summary><p>{t("Ghi rõ màu và size mong muốn trong phần ghi chú đặt hàng. Shop sẽ xác nhận lựa chọn và tình trạng sản phẩm trước khi giao. Hình ảnh có thể khác nhẹ về màu do màn hình.")}</p></details></div></section>
 <section className="social-section"><span className="eyebrow">{t("STAY A LITTLE LONGER")}</span><h2>{t("Gặp AURA ở những nơi bạn thích.")}</h2><p>{t("Những cách phối đồ mới, những món xinh và câu chuyện mỗi ngày.")}</p><SocialLinks /></section></main>
 <footer><div className="footer-top"><div><a className="brand" href="#">{t("AURA L’AMOUR")}<span>{t("CURATED WITH LOVE")}</span></a><p>{t("Túi xinh. Áo đẹp. Ngày thêm yêu.")}</p></div><div className="footer-links"><b>{t("Khám phá")}</b><button onClick={() => browse('Áo')}>{t("Áo")}</button><button onClick={() => browse('Túi')}>{t("Túi")}</button><button onClick={() => {
            setOnlyFavorites(true);
            setCategory('Tất cả');
            setSearch('');
            document.getElementById('shop').scrollIntoView({
              behavior: 'smooth'
            });
          }}>{t("Sản phẩm đã lưu")}</button></div><div className="footer-links"><b>{t("Thông tin mua hàng")}</b><button onClick={() => setModal('policy')}>{t("Giao hàng & quyền riêng tư")}</button><button onClick={() => setCookie(true)}>{t("Tùy chọn cookie")}</button><a href="#style-edit">{t("Gợi ý phối đồ")}</a></div><div><span className="footer-heading">{t("Kết nối với AURA")}</span><SocialLinks /></div></div><div className="footer-bottom"><small>{t("© 2026 AURA L’AMOUR")}</small><span>{t("Made for your lovely everyday.")}</span></div></footer>
 {translateValue(toast && <div className="toast" role="status"><Icon name="check" />{translateValue(toast, t)}<button onClick={() => {
        setToast('');
        setModal('cart');
      }}>{t("Xem giỏ →")}</button></div>, t)}
 {translateValue(cookie && <div className="cookies" role="region" aria-label={t("Tùy chọn cookie")}><div><b>{t("Một trải nghiệm phù hợp với bạn")}</b><p>{t("Giỏ hàng dùng bộ nhớ cần thiết. Nếu đồng ý, Meta Pixel ghi nhận hành động mua sắm để đo lường quảng cáo. ")}<button onClick={() => setModal('policy')}>{t("Xem chi tiết")}</button></p></div><button className="outline" onClick={() => {
        consent(false);
        setCookie(false);
      }}>{t("Chỉ cần thiết")}</button><button className="dark" onClick={() => {
        consent(true);
        setCookie(false);
      }}>{t("Đồng ý quảng cáo")}</button></div>, t)}
 {translateValue(modal && <Dialog busy={busy} drawer={modal === 'cart'} label={translateValue({
      cart: 'Giỏ hàng',
      product: selected?.name,
      checkout: 'Thông tin nhận hàng',
      success: 'Đặt hàng thành công',
      policy: 'Chính sách mua hàng'
    }[modal], t)} onClose={() => setModal(null)}>
 {translateValue(modal === 'product' && selected && <><div className="detail"><div className="detail-image"><img sizes="(max-width: 760px) 88vw, 600px" {...auraImageSet(selected.image)} src={selected.image} alt={translateValue(selected.name, t)} /></div><div><span className="eyebrow">{translateValue(selected.category, t)}{t(" / THE EVERYDAY EDIT")}</span><h2>{translateValue(selected.name, t)}</h2><p className="sku">{t("Mã: ")}{translateValue(selected.id, t)}</p><strong className="detail-price">{translateValue(money(selected.price), t)}</strong><p>{translateValue(selected.description, t)}</p><div className="detail-facts"><span><Icon name="bag" />{t("Thanh toán khi nhận hàng")}</span><span><Icon name="truck" />{t("30.000₫ · Miễn phí từ 1.000.000₫")}</span></div><p className="detail-hint">{t("Màu / size mong muốn: ghi chú khi đặt hàng. Shop xác nhận trước khi giao.")}</p><button className="dark full" onClick={() => add(selected)}><Icon name="bag" />{t("Thêm vào giỏ hàng")}</button><button className="outline full" onClick={() => favorite(selected)}><Icon name="heart" />{translateValue(favorites.includes(selected.id) ? 'Đã lưu vào yêu thích' : 'Lưu lại để xem sau', t)}</button></div></div><div className="related"><span className="eyebrow">{t("CÓ THỂ BẠN CŨNG THÍCH")}</span><div className="related-grid">{translateValue(products.filter(p => p.id !== selected.id).slice(0, 3).map(p => <button key={p.id} onClick={() => view(p)}><img sizes="(max-width:760px) calc(45vw - 24px), (max-width:1400px) 22vw, 320px" {...auraImageSet(p.image)} src={p.image} alt={translateValue(p.name, t)} /><span>{translateValue(p.name, t)}<b>{translateValue(money(p.price), t)}</b></span></button>), t)}</div></div></>, t)}
 {translateValue(modal === 'cart' && <><span className="eyebrow">{t("YOUR LITTLE FINDS")}</span><h2>{t("Giỏ hàng ")}<span>{t("(")}{translateValue(count, t)}{t(")")}</span></h2>{translateValue(!lines.length ? <div className="empty-state"><Icon name="bag" /><h3>{t("Giỏ hàng đang chờ món xinh đầu tiên")}</h3><button className="dark" onClick={() => {
            setModal(null);
            browse('Tất cả');
          }}>{t("Khám phá bộ sưu tập ")}<Icon name="arrow" /></button></div> : <><div className="shipping-progress"><p>{translateValue(subtotal >= 1000000 ? 'Đơn của bạn được miễn phí giao hàng!' : <>{t("Thêm ")}<b>{translateValue(money(1000000 - subtotal), t)}</b>{t(" để được miễn phí giao hàng")}</>, t)}</p><progress max="1000000" value={Math.min(subtotal, 1000000)} /></div><div className="cart-lines">{translateValue(lines.map(p => <div className="cart-line" key={p.id}><img sizes="(max-width:760px) calc(45vw - 24px), (max-width:1400px) 22vw, 320px" {...auraImageSet(p.image)} src={p.image} alt={translateValue(p.name, t)} /><div><b>{translateValue(p.name, t)}</b><small>{translateValue(p.id, t)}</small><p>{translateValue(money(p.price), t)}</p><div className="quantity"><button aria-label={translateValue('Giảm ' + p.name, t)} onClick={() => setCart(c => c.map(i => i.id === p.id ? {
                    ...i,
                    quantity: i.quantity - 1
                  } : i).filter(i => i.quantity > 0))}>{t("−")}</button><span>{translateValue(p.quantity, t)}</span><button aria-label={translateValue('Tăng ' + p.name, t)} disabled={p.quantity >= 20} onClick={() => setCart(c => c.map(i => i.id === p.id ? {
                    ...i,
                    quantity: Math.min(20, i.quantity + 1)
                  } : i))}>{t("+")}</button><button className="remove" onClick={() => setCart(c => c.filter(i => i.id !== p.id))}>{t("Xóa")}</button></div></div></div>), t)}</div><div className="totals"><p>{t("Tạm tính ")}<b>{translateValue(money(subtotal), t)}</b></p><p>{t("Giao hàng ")}<b>{translateValue(shipping ? money(shipping) : 'Miễn phí', t)}</b></p><p>{t("Tổng cộng ")}<b>{translateValue(money(subtotal + shipping), t)}</b></p></div><button className="dark full" onClick={checkout}>{t("Tiến hành đặt hàng ")}<Icon name="arrow" /></button><p className="secure-note">{t("Thanh toán COD · Shop liên hệ xác nhận trước khi giao")}</p></>, t)}</>, t)}
 {translateValue(modal === 'checkout' && <><span className="eyebrow">{t("ALMOST YOURS")}</span><h2>{t("Thông tin nhận hàng")}</h2><div className="checkout-summary">{translateValue(lines.map(p => <p key={p.id}><span>{translateValue(p.name, t)}{t(" × ")}{translateValue(p.quantity, t)}</span><b>{translateValue(money(p.price * p.quantity), t)}</b></p>), t)}<p><span>{t("Giao hàng")}</span><b>{translateValue(shipping ? money(shipping) : 'Miễn phí', t)}</b></p><p><strong>{t("Tổng COD")}</strong><strong>{translateValue(money(subtotal + shipping), t)}</strong></p></div><form onSubmit={submit}><div className="form-grid"><label>{t("Họ và tên")}<input name="name" required minLength="2" maxLength="100" autoComplete="name" /></label><label>{t("Số điện thoại")}<input name="phone" type="tel" required pattern="(0|\+84)[0-9]{9}" placeholder={t("0901234567")} autoComplete="tel" /></label></div><label>{t("Địa chỉ đầy đủ")}<textarea name="address" required minLength="10" maxLength="500" autoComplete="street-address" placeholder={t("Số nhà, đường, phường/xã, tỉnh/thành")} /></label><label>{t("Ghi chú màu, size hoặc yêu cầu khác")}<textarea name="note" maxLength="500" placeholder={t("Ví dụ: mã áo, size cần tư vấn, thời gian nhận hàng…")} /></label><label className="check"><input type="checkbox" required />{t("Tôi đồng ý sử dụng thông tin trên để xử lý và giao đơn hàng.")}</label>{translateValue(error && <p className="error" role="alert">{translateValue(error, t)}</p>, t)}<button className="dark full" disabled={busy || !lines.length}>{translateValue(busy ? 'Đang lưu đơn…' : 'Xác nhận đặt hàng COD', t)}<Icon name="arrow" /></button></form></>, t)}
 {translateValue(modal === 'success' && order && <div className="success"><div className="success-icon"><Icon name="check" /></div><span className="eyebrow">{t("THANK YOU, LOVELY")}</span><h2>{t("Món xinh đã được đặt!")}</h2><p>{t("Đơn đã được lưu. Shop sẽ liên hệ xác nhận mẫu, màu và size trước khi giao.")}</p><p className="order-id">{translateValue(order.id, t)}</p><b>{translateValue(money(order.total), t)}{t(" · COD, chưa thanh toán")}</b><button className="dark full" onClick={() => setModal(null)}>{t("Khám phá thêm ")}<Icon name="arrow" /></button></div>, t)}
 {translateValue(modal === 'policy' && <><span className="eyebrow">{t("SHOPPING WITH AURA")}</span><h2>{t("Giao hàng & quyền riêng tư")}</h2><p>{t("Phí giao hàng: 30.000₫; miễn phí từ 1.000.000₫. Đơn COD cần được shop xác nhận trước khi giao. Thời gian giao, tình trạng mẫu, màu và size được xác nhận khi shop liên hệ.")}</p><p>{t("Họ tên, số điện thoại, địa chỉ và ghi chú được lưu trên máy chủ để xử lý đơn. Mã website không gắn các trường này vào payload Pixel. Giỏ hàng và sản phẩm yêu thích được lưu trên trình duyệt.")}</p><p>{t("Nếu đồng ý quảng cáo, website tải Meta Pixel để đo lượt truy cập và hành động mua sắm. Bạn có thể rút đồng ý tại “Tùy chọn cookie”; việc rút đồng ý không xóa dữ liệu đã gửi.")}</p><p>{t("Thông tin liên hệ, chính sách đổi trả, thời hạn lưu và quy trình xóa dữ liệu cần được chủ shop bổ sung trước khi mở bán chính thức.")}</p></>, t)}
 </Dialog>, t)}</>;
}
if (!import.meta.env.SSR) {
  const root = document.getElementById('root');
  if (root.hasChildNodes()) hydrateRoot(root, <App />);else createRoot(root).render(<App />);
}
function auraImageSet(src) {
  const records = {
    "/images/au1": {
      "240": {
        "width": 240,
        "height": 240
      },
      "320": {
        "width": 320,
        "height": 320
      },
      "480": {
        "width": 480,
        "height": 480
      },
      "640": {
        "width": 640,
        "height": 640
      },
      "800": {
        "width": 800,
        "height": 800
      },
      "1000": {
        "width": 1000,
        "height": 1000
      }
    },
    "/images/au2": {
      "240": {
        "width": 240,
        "height": 233
      },
      "320": {
        "width": 320,
        "height": 311
      },
      "480": {
        "width": 480,
        "height": 467
      },
      "640": {
        "width": 640,
        "height": 622
      },
      "800": {
        "width": 800,
        "height": 778
      },
      "1000": {
        "width": 1000,
        "height": 973
      }
    },
    "/images/au3": {
      "240": {
        "width": 240,
        "height": 206
      },
      "320": {
        "width": 320,
        "height": 275
      },
      "480": {
        "width": 480,
        "height": 412
      },
      "640": {
        "width": 640,
        "height": 550
      },
      "800": {
        "width": 800,
        "height": 687
      },
      "1000": {
        "width": 1000,
        "height": 859
      }
    },
    "/images/au4": {
      "240": {
        "width": 240,
        "height": 231
      },
      "320": {
        "width": 320,
        "height": 307
      },
      "480": {
        "width": 480,
        "height": 461
      },
      "640": {
        "width": 640,
        "height": 615
      },
      "800": {
        "width": 800,
        "height": 769
      },
      "1000": {
        "width": 1000,
        "height": 961
      }
    },
    "/images/au5": {
      "240": {
        "width": 240,
        "height": 180
      },
      "320": {
        "width": 320,
        "height": 240
      },
      "480": {
        "width": 480,
        "height": 360
      },
      "640": {
        "width": 640,
        "height": 480
      },
      "800": {
        "width": 800,
        "height": 600
      },
      "1000": {
        "width": 1000,
        "height": 750
      }
    }
  };
  if (typeof src !== 'string') return {};
  const base = src.replace(/\.(jpg|webp)$/, '');
  const images = records[base];
  if (!images) return {};
  const largest = images[1000];
  return {
    srcSet: Object.entries(images).map(([key, image]) => base + '-' + key + '.webp ' + image.width + 'w').join(', '),
    width: largest.width,
    height: largest.height,
    decoding: 'async'
  };
}
export function App(){return <LanguageProvider><Shop/></LanguageProvider>}
