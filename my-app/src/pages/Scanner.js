import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../firebase/firebase-config';
import { collection, getDocs } from 'firebase/firestore';
import Webcam from 'react-webcam';
import { BrowserMultiFormatReader } from '@zxing/library';
import './Scanner.css';

const Scanner = ({ updateItem, deleteItem, saveItem }) => {
  const [quantityInput, setQuantityInput] = useState(1);
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState('');
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [videoDevices, setVideoDevices] = useState([]);
  const [searchedItem, setSearchedItem] = useState(null);
  const webcamRef = useRef(null);
  const codeReader = useRef(new BrowserMultiFormatReader());

  // Fetch items from Firestore
  const fetchItems = async () => {
    try {
      const itemsCollection = collection(db, 'items');
      const itemSnapshot = await getDocs(itemsCollection);
      const itemList = itemSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setItems(itemList);
    } catch (error) {
      console.error("Error fetching items:", error);
      setMessage("Error fetching items. Please try again.");
    }
  };

  // Get camera devices on mount
  useEffect(() => {
    const getDevices = async () => {
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
        setVideoDevices(videoDevices);
        if (videoDevices.length > 0) {
          setSelectedDeviceId(videoDevices[0].deviceId); // Default to the first device
        }
      } catch (error) {
        console.error("Error accessing camera devices:", error);
        setMessage("Error accessing camera devices. Please check your permissions.");
      }
    };

    getDevices();
  }, []);

  // Fetch items when component mounts
  useEffect(() => {
    fetchItems();
  }, []);

  // Handle barcode scan to update/delete or search item based on quantity
  const handleBarcodeScan = useCallback(async (barcode) => {
    const item = items.find(item => item.barcode === barcode);
    if (item) {
      if (searchMode) {
        setSearchedItem(item);
        setMessage(`Found item: '${item.text}' - Quantity: ${item.quantity}`);
        setCameraEnabled(false); // Automatically close the camera after a successful search
      } else {
        const updatedQuantity = item.quantity - quantityInput;
        if (updatedQuantity < 0) {
          setMessage(`Cannot reduce quantity below zero for item '${item.text}'.`);
        } else if (updatedQuantity === 0) {
          await deleteItem(item.id); // Call delete function
          setMessage(`Item '${item.text}' deleted as quantity is now zero.`);
        } else {
          await updateItem(item.id, { quantity: updatedQuantity }); // Call update function
          setMessage(`Updated item '${item.text}'. New quantity: ${updatedQuantity}.`);
        }
        await fetchItems(); // Refresh the item list
      }
    } else {
      setMessage('Item not found. Please check the barcode and try again.');
      setSearchedItem(null); // Reset the searched item if not found
    }
  }, [items, quantityInput, searchMode, updateItem, deleteItem]);

  // Handle scanning from the camera for updating/deleting or searching for items
  const handleScanFromCamera = useCallback(() => {
    if (webcamRef.current) {
      codeReader.current.decodeFromVideoDevice(selectedDeviceId, webcamRef.current.video, (result, err ) => {
        if (result) {
          handleBarcodeScan(result.text);
          if (!searchMode) setCameraEnabled(false); // Stop the camera if not in search mode
        }
        if (err && !(err instanceof Error)) {
          console.error(err);
        }
      });
    }
  }, [selectedDeviceId, handleBarcodeScan, searchMode]);

  // Start or stop camera scanning
  useEffect(() => {
    if (cameraEnabled) {
      handleScanFromCamera();
    } else {
      codeReader.current.reset();
    }
  }, [cameraEnabled, handleScanFromCamera]);

  // Handle barcode submission for update/delete
  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    setCameraEnabled(true); // Enable the camera for scanning
  };

  // Approve and save item data
  const handleApproveItem = async () => {
    if (searchedItem) {
      await saveItem(searchedItem); // Call save function to store the item
      setMessage(`Item '${searchedItem.text}' approved and saved.`);
      setSearchedItem(null); // Reset searched item after saving
    } else {
      setMessage('No item selected for approval.');
    }
  };

  return (
    <div>
      <h1>Scanner</h1>
      <form onSubmit={handleBarcodeSubmit}>
        <input
          type="number"
          value={quantityInput}
          onChange={(e) => setQuantityInput(Number(e.target.value))}
          placeholder="Quantity"
          min="1"
          required
        />
        <button type="submit">Get Item</button>
      </form>

      <button onClick={() => {
        setSearchMode(true);
        setCameraEnabled(true);
      }}>
        Search Item through Scan
      </button>

      <button onClick={handleApproveItem}>
        Approve and Save Item
      </button>

      {message && <p className="message">{message}</p>}

      {searchedItem && (
        <div className="searched-item">
          <h2>Searched Item Details:</h2>
          <p><strong>Name:</strong> {searchedItem.text}</p>
          <p><strong>Barcode:</strong> {searchedItem.barcode}</p>
          <p><strong>Quantity:</strong> {searchedItem.quantity}</p>
          <p><strong>College:</strong> {searchedItem.college}</p>
          <p><strong>Category:</strong> {searchedItem.category}</p>
        </div>
      )}

      <div>
        <label htmlFor="cameraSelect">Select Camera:</label>
        <select
          id="cameraSelect"
          value={selectedDeviceId}
          onChange={(e) => setSelectedDeviceId(e.target.value)}
        >
          {videoDevices.map(device => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Camera ${device.deviceId}`}
            </option>
          ))}
        </select>
      </div>

      {cameraEnabled && (
        <div>
          <Webcam ref={webcamRef} width="300" height="200" videoConstraints={{ deviceId: selectedDeviceId }} />
          <button onClick={() => setCameraEnabled(false)}>Stop Camera</button>
        </div>
      )}

      <h2>All Items</h2>
      <ul>
        {items.map(item => (
          <li key={item.id}>
            {item.text} - Barcode: {item.barcode} - Quantity: {item.quantity} - College: {item.college} - Category: {item.category}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Scanner;