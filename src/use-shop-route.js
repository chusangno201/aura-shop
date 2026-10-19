
import {useEffect,useRef,useState} from 'react';

export function useShopRoute(products,onProduct){
  const [modal,setState]=useState(null);
  const productRef=useRef(onProduct);
  productRef.current=onProduct;

  useEffect(()=>{
    function restore(){
      const path=window.location.pathname.replace(/\/+$/,'') || '/';
      const match=path.match(/^\/san-pham\/([\w-]+)$/);

      if(match){
        const product=products.find(p=>p.id===match[1]);
        if(product){
          productRef.current(product);
          setState('product');
        }else{
          setState(null);
        }
      }else{
        setState({
          '/giohang':'cart',
          '/thanh-toan':'checkout',
          '/chinh-sach':'policy'
        }[path] || null);
      }
    }

    restore();
    window.addEventListener('popstate',restore);
    return ()=>window.removeEventListener('popstate',restore);
  },[products]);

  function navigate(next,id){
    const paths={
      cart:'/giohang',
      checkout:'/thanh-toan',
      policy:'/chinh-sach'
    };
    const path=next==='product' && id
      ? '/san-pham/'+encodeURIComponent(id)
      : paths[next] || '/';

    if(window.location.pathname!==path){
      window.history.pushState({},'',path);
    }
    setState(next);
  }

  return [modal,navigate];
}
