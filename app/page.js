// pages/index.js
import UploadImage from './components/UploadImage';
//import Image from 'next/image';
export default function Home() {
  return (
    <>
      <div className="container mx-auto p-6">
        <UploadImage />
      </div>
    </>
  );
}
