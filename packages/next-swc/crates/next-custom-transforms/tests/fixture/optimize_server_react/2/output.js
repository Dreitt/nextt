// https://github.com/vercel/commerce/blob/18167d22f31fce6c90f98912e514243236200989/components/layout/search/filter/dropdown.tsx#L16
'use client';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { FilterItem } from './item';
export default function FilterItemDropdown({ list }) {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [active, setActive] = [
        '',
        ()=>null
    ];
    const [openSelect, setOpenSelect] = [
        false,
        ()=>null
    ];
    const ref = useRef(null);
    null;
    null;
    return <div className="relative" ref={ref}>
      <div onClick={()=>{
        setOpenSelect(!openSelect);
    }} className="flex w-full items-center justify-between rounded border border-black/30 px-4 py-2 text-sm dark:border-white/30">
        <div>{active}</div>
        <ChevronDownIcon className="h-4"/>
      </div>
      {openSelect && <div onClick={()=>{
        setOpenSelect(false);
    }} className="absolute z-40 w-full rounded-b-md bg-white p-4 shadow-md dark:bg-black">
          {list.map((item, i)=><FilterItem key={i} item={item}/>)}
        </div>}
    </div>;
}
