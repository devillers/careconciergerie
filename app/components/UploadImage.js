// components/UploadImage.js
'use client';
import { useState, useEffect, useRef } from 'react';
import { ref, uploadBytes, getDownloadURL, listAll } from 'firebase/storage';
import { collection, addDoc } from 'firebase/firestore';
import { storage, db } from '../../firebaseConfig';

export default function UploadImage() {
  const [images, setImages] = useState([]);
  const [urls, setUrls] = useState([]);
  const [progress, setProgress] = useState(0);
  const [fileNames, setFileNames] = useState([]);
  const [existingImagesCount, setExistingImagesCount] = useState(0);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const [userData, setUserData] = useState({
    streetName: '',
    streetNumber: '',
    postCode: '',
    town: '',
    country: '',
    housingName: '',
    name: '',
    surname: '',
    siteWeb: '',
    mobile: '+33766797364',
  });
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const fetchExistingImages = async () => {
      try {
        const listRef = ref(storage, 'images/');
        const result = await listAll(listRef);
        setExistingImagesCount(result.items.length);
      } catch (err) {
        console.error('Error fetching existing images:', err);
        setError('Error fetching existing images. Please try again later.');
      }
    };
    fetchExistingImages();
  }, []);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(
      (file) =>
        file.size <= 31457280 && ['image/jpeg', 'image/png'].includes(file.type)
    );
    const totalImagesCount = existingImagesCount + validFiles.length;

    if (totalImagesCount <= 10) {
      setFileNames(
        validFiles.map(
          (file, index) => `image-${existingImagesCount + index + 1}.jpeg`
        )
      );
      setProgress(10); // Initial progress
      const compressions = validFiles.map((file, index) =>
        compressImage(file, 1, existingImagesCount + index + 1)
      );
      Promise.all(compressions)
        .then((compressedFiles) => {
          setImages([...images, ...compressedFiles]);
          setProgress(0); // Reset progress after compression
        })
        .catch((err) => {
          console.error('Error compressing images:', err);
          setError('Error compressing images. Please try again later.');
        });
    } else {
      alert(
        'You can only have up to 10 JPEG or PNG images in total, including already uploaded images.'
      );
    }
  };

  const compressImage = (file, maxSizeMB, index) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const width = img.width;
          const height = img.height;
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          setProgress((prev) => prev + 20); // Update progress

          const compressAndResolve = (quality) => {
            canvas.toBlob(
              (blob) => {
                const compressedFile = new File([blob], `image-${index}.jpeg`, {
                  type: file.type,
                });
                if (compressedFile.size > maxSizeMB * 1024 * 1024) {
                  compressAndResolve(quality - 0.1); // Reduce quality further if needed
                } else {
                  setProgress((prev) => prev + 40); // Compression complete
                  resolve(compressedFile);
                }
              },
              file.type,
              quality
            );
          };

          compressAndResolve(0.9); // Start compression with 90% quality
        };
        img.onerror = (err) => {
          console.error('Error loading image for compression:', err);
          reject(err);
        };
      };
      reader.onerror = (err) => {
        console.error('Error reading file for compression:', err);
        reject(err);
      };
    });
  };

  const handleUpload = () => {
    if (images.length > 0) {
      const uploads = images.map((image, index) => {
        const storageRef = ref(
          storage,
          `images/image-${existingImagesCount + index + 1}.jpeg`
        );
        return uploadBytes(storageRef, image)
          .then((snapshot) => getDownloadURL(snapshot.ref))
          .catch((err) => {
            console.error('Error uploading image:', err);
            setError('Error uploading image. Please try again later.');
            throw err;
          });
      });

      Promise.all(uploads)
        .then((downloadURLs) => {
          console.log('Files available at', downloadURLs);
          setUrls(downloadURLs);
        })
        .catch((err) => {
          console.error('Error uploading images:', err);
          setError('Error uploading images. Please try again later.');
        });
    }
  };

  const handleFileSelectClick = async () => {
    // Clear the existing images and file input
    setImages([]);
    setFileNames([]);
    setUrls([]);
    setProgress(0);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = null; // Reset file input
    }

    // Fetch existing images count again to update the count
    try {
      const listRef = ref(storage, 'images/');
      const result = await listAll(listRef);
      setExistingImagesCount(result.items.length);
    } catch (err) {
      console.error('Error fetching existing images:', err);
      setError('Error fetching existing images. Please try again later.');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (
      (name === 'postCode' || name === 'streetNumber') &&
      !/^\d*$/.test(value)
    ) {
      setFormError(`la valeur doit être un chiffre`);
    } else {
      setFormError('');
      setUserData({
        ...userData,
        [name]: value,
      });
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (Object.values(userData).some((field) => field === '')) {
      setFormError('Tous les champs doivent être remplis.');
      return;
    }
    if (formError) {
      return;
    }
    try {
      console.log('Submitting form with data: ', userData); // Debugging log
      const docRef = await addDoc(collection(db, 'user_details'), userData);
      console.log('Document written with ID: ', docRef.id); // Debugging log
      setSuccessMessage('données sauvegardées');
      // Clear form fields after successful submission
      setUserData({
        streetName: '',
        streetNumber: '',
        postCode: '',
        town: '',
        housingName: '',
        name: '',
        surname: '',
        country: '',
        siteWeb: '',
        mobile: '+33766797364',
      });
    } catch (err) {
      console.error('Error saving user details:', err);
      setError('Error saving user details. Please try again later.');
    }
  };

  return (
    <div className="mx-auto max-w-xl p-6 flex flex-col items-center space-y-4 bg-white shadow-md rounded-lg">
      {error && (
        <div className="w-full bg-red-100 text-red-800 p-4 rounded-lg">
          {error}
        </div>
      )}

      {existingImagesCount > 0 && (
        <div className="w-full bg-gray-200 rounded-lg p-4 text-[12px]">
          <h3 className="text-sm font-semibold mb-2">fichiers existants:</h3>
          <p>{existingImagesCount} image(s) sauvegardées.</p>
        </div>
      )}

      <form
        onSubmit={handleFormSubmit}
        className="w-full flex flex-col space-y-4 text-[12px]"
      >
        <input
          type="text"
          name="housingName"
          placeholder="nom du logement"
          value={userData.housingName}
          onChange={handleInputChange}
          className="w-full px-4 py-2 border rounded-lg"
        />
        <input
          type="text"
          name="streetNumber"
          placeholder="numéro de rue "
          value={userData.streetNumber}
          onChange={handleInputChange}
          className="w-full px-4 py-2 border rounded-lg"
        />
        <input
          type="text"
          name="streetName"
          placeholder="nom de rue"
          value={userData.streetName}
          onChange={handleInputChange}
          className="w-full px-4 py-2 border rounded-lg"
        />

        <input
          type="text"
          name="postCode"
          placeholder="code postal"
          value={userData.postCode}
          onChange={handleInputChange}
          className="w-full px-4 py-2 border rounded-lg"
        />
        <input
          type="text"
          name="town"
          placeholder="ville"
          value={userData.town}
          onChange={handleInputChange}
          className="w-full px-4 py-2 border rounded-lg"
        />
        <input
          type="text"
          name="country"
          placeholder="pays"
          value={userData.country}
          onChange={handleInputChange}
          className="w-full px-4 py-2 border rounded-lg"
        />
        <input
          type="text"
          name="siteWeb"
          placeholder="annonce care concierge"
          value={userData.siteWeb}
          onChange={handleInputChange}
          className="w-full px-4 py-2 border rounded-lg"
        />

        <input
          type="text"
          name="mobile"
          placeholder="+33766797364"
          value="+33766797364"
          readOnly
          className="w-full px-4 py-2 border rounded-lg"
        />

        <input
          type="text"
          name="name"
          placeholder="prénom"
          value={userData.name}
          onChange={handleInputChange}
          className="w-full px-4 py-2 border rounded-lg"
        />
        <input
          type="text"
          name="surname"
          placeholder="nom"
          value={userData.surname}
          onChange={handleInputChange}
          className="w-full px-4 py-2 border rounded-lg"
        />
        {formError && (
          <div className="w-full bg-red-100 text-red-800 p-2 rounded-lg text-[12px] pl-4">
            {formError}
          </div>
        )}
        <button
          type="submit"
          className="px-4 py-2 bg-green-600 text-white rounded-lg shadow-md hover:bg-green-700  pl-4 text-[12px]"
        >
          sauvegarder votre annonce google
        </button>
        {/* <h4>selectionner 10 photos max</h4> */}
      </form>

      {successMessage && (
        <div className="w-full bg-green-100 text-green-800 p-2 rounded-lg text-[12px] pl-4">
          {successMessage}
        </div>
      )}

      <div className="flex items-center justify-center w-full mt-4">
        <label
          className=" w-full px-4 py-2 bg-pink-600 text-white rounded-lg shadow-md hover:bg-pink-700 text-center text-[12px] transition duration-300 ease-in-out"
          onClick={handleFileSelectClick}
        >
          <span className="text-[12px] leading-normal">
            selectionner vos photos
          </span>
          <input
            type="file"
            multiple
            onChange={handleImageChange}
            className="hidden"
            ref={fileInputRef}
          />
        </label>
      </div>

      {fileNames.length > 0 && (
        <div className="w-full bg-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-2">fichier selectionné:</h3>
          <ul className=" list-inside">
            {fileNames.map((name, index) => (
              <li className=" text-sm text-pink-500" key={index}>
                {name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {progress > 0 && progress < 100 && (
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}

      <button
        className=" w-full px-4 py-2 bg-blue-600 text-white text-[12px] rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
        onClick={handleUpload}
      >
        valider vos photos
      </button>
      {urls.length > 0 && (
        <div className="mt-4 w-full grid grid-cols-1 gap-4">
          {urls.map((url, index) => (
            <img
              key={index}
              src={url}
              alt={`Uploaded image ${index + 1}`}
              className="w-full h-auto rounded-lg shadow-md"
            />
          ))}
        </div>
      )}
    </div>
  );
}
