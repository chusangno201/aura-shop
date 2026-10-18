import test from 'node:test';
import assert from 'node:assert/strict';
import {priceOrder,products} from './products.js';
test('price is taken from server catalog, not browser',()=>{assert.equal(priceOrder([{id:'AURA-HONG-01',quantity:1,price:1}]).total,530000)});
test('shipping free above threshold',()=>assert.equal(priceOrder([{id:'AURA-HONG-01',quantity:2}]).shipping,0));
test('reject invalid, duplicate and unknown lines',()=>{for(const items of [[],[{id:'AURA-HONG-01',quantity:-1}],[{id:'AURA-HONG-01',quantity:1.5}],[{id:'bad',quantity:1}],[{id:'AURA-HONG-01',quantity:1},{id:'AURA-HONG-01',quantity:1}]])assert.throws(()=>priceOrder(items))});

test('catalog matches supplied codes and prices',()=>assert.deepEqual(products.map(p=>[p.id,p.price]),[['AURA-HONG-01',500000],['AURA-CAM-02',380000],['AURA-TRANG-03',470000],['AURA-KHOAC-04',185000],['AURA-VAY-05',270000]]));
test('only two product categories',()=>assert.deepEqual([...new Set(products.map(p=>p.category))].sort(),['Túi','Áo'].sort()));

import {filterProducts} from '../src/catalog.js';
test('category filtering, code and accent insensitive search, price order',()=>{
 assert.equal(filterProducts(products,'Áo','', 'featured').length,2);
 assert.equal(filterProducts(products,'Túi','', 'featured').length,3);
 assert.equal(filterProducts(products,'Tất cả','aura-khoac','featured')[0].price,185000);
 assert.equal(filterProducts(products,'Áo','ao khoac','featured').length,1);
 assert.equal(filterProducts(products,'Tất cả','','low')[0].id,'AURA-KHOAC-04');
 assert.equal(filterProducts(products,'Túi','notfound','featured').length,0);
});
