import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../firebase/firebase-config';
import { collection, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import Webcam from 'react-webcam';
import { BrowserMultiFormatReader } from '@zxing/library';
import JsBarcode from 'jsbarcode';
import './Scanner.css';

const Scanner = () => {
  const [quantityInput, setQuantityInput] = useState(1);
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState('');
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [videoDevices, setVideoDevices] = useState([]);
  const [searchedItem, setSearchedItem] = useState(null);
  const [deletedLogs, setDeletedLogs] = useState([]); // State for deleted logs
  const [showDeletedLogs, setShowDeletedLogs] = useState(false); // State to control visibility of Deleted Logs
  const webcamRef = useRef(null);
  const codeReader = useRef(new BrowserMultiFormatReader());

  // Fetch items from Firestore
  const fetchItems = async () => {
    const itemsCollection = collection(db, 'items');
    const itemSnapshot = await getDocs(itemsCollection);
    const itemList = itemSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setItems(itemList);
  };

  // Get camera devices on mount
  useEffect(() => {
    const getDevices = async () => {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
      setVideoDevices(videoDevices);
      if (videoDevices.length > 0) {
        setSelectedDeviceId(videoDevices[0].deviceId);
      }
    };

    getDevices();
  }, []);

  // Fetch items when component mounts
  useEffect(() => {
    fetchItems();
  }, []);

  // Handle barcode scan to update/delete or search item
  const handleBarcodeScan = useCallback(async (barcode) => {
    const item = items.find(item => item.barcode === barcode);
    if (item) {
      if (searchMode) {
        setSearchedItem(item);
        setMessage(`Found item: '${item.text}' - Quantity: ${item.quantity}`);
        setCameraEnabled(false);
      } else {
        const updatedQuantity = item.quantity - quantityInput;
        const itemDoc = doc(db, 'items', item.id);

        if (updatedQuantity <= 0) {
          await deleteDoc(itemDoc);
          setDeletedLogs(prevLogs => [
            ...prevLogs,
            {
              id: item.id,
              text: item.text,
              barcode: item.barcode,
              deletedAt: new Date().toLocaleString()
            }
          ]); // Add log entry for deleted item
          setMessage(`Item '${item.text}' deleted as quantity is now zero.`);
        } else {
          await updateDoc(itemDoc, { quantity: updatedQuantity });
          setMessage(`Updated item '${item.text}'. New quantity: ${updatedQuantity}.`);
        }
        await fetchItems();
      }
    } else {
      setMessage('Item not found. Please check the barcode and try again.');
      setSearchedItem(null);
    }
  }, [items, quantityInput, searchMode]);

  // Handle scanning from the camera
  const handleScanFromCamera = useCallback(() => {
    if (webcamRef.current) {
      codeReader.current.decodeFromVideoDevice(selectedDeviceId, webcamRef.current.video, (result, err) => {
        if (result) {
          handleBarcodeScan(result.text);
          if (!searchMode) setCameraEnabled(false);
        }
        if (err) {
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

  // Render barcode for each item
  const renderBarcode = (barcode, elementId) => {
    if (barcode) {
      JsBarcode(`#${elementId}`, barcode, {
        format: "CODE128",
        lineColor: "#000",
        width: 2,
        height: 50,
        displayValue: false
      });
    }
  };

  // Generate barcodes for items
  useEffect(() => {
    items.forEach(item => {
      renderBarcode(item.barcode, `barcode-${item.id}`);
    });
  }, [items]);

  // Handle barcode submission
  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    setCameraEnabled(true);
  };

  // Save barcode image with college name
  const saveBarcodeImage = (barcode, college) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const canvasWidth = 200;
    const canvasHeight = 100;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    JsBarcode(canvas, barcode, {
      format: "CODE128",
      lineColor: "#000",
      width: 2,
      height: 50,
      displayValue: false
    });

    ctx.font = "10px Arial";
    ctx.fillStyle = "black";
    ctx.textAlign = "center";
    ctx.fillText(college, canvasWidth / 2, canvasHeight - 10);

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `${college}_barcode_${barcode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setMessage(`Saved barcode for ${college}: ${barcode}`);
  };

  return (
    <div className="customscanner-container">
      <h1 className="customscanner-title">Scanner</h1>

      <form onSubmit={handleBarcodeSubmit} className="customscanner-form">
        <input
          type="number"
          value={quantityInput}
          onChange={(e) => setQuantityInput(Number(e.target.value))}
          placeholder="Quantity"
          min="1"
          required
          className="customscanner-input"
        />
        <button type="submit" className="customscanner-btn">Get Item</button>
      </form>

      <button onClick={() => {
        setSearchMode(true);
        setCameraEnabled(true);
      }} className="customscanner-btn">
        Search Item through Scan
      </button>

      {message && <p className="customscanner-message">{message}</p>}

      {searchedItem && (
        <div className="customscanner-searched-item">
          <h2>Searched Item Details:</h2>
          <p><strong>Name:</strong> {searchedItem.text}</p>
          <p><strong>Barcode:</strong> {searchedItem.barcode}</p>
          <p><strong>Quantity:</strong> {searchedItem.quantity}</p>
          <p><strong>College:</strong> {searchedItem.college}</p>
          <p><strong>Category:</strong> {searchedItem.category}</p>
        </div>
      )}

      <div className="customscanner-camera-select">
        <label htmlFor="cameraSelect">Select Camera:</label>
        <select
          id="cameraSelect"
          value={selectedDeviceId}
          onChange={(e) => setSelectedDeviceId(e.target.value)}
          className="customscanner-select"
        >
          {videoDevices.map(device => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Camera ${device.deviceId}`}
            </option>
          ))}
        </select>
      </div>

      {cameraEnabled && (
        <div className="customscanner-camera">
          <Webcam ref={webcamRef} width="200" height="200" videoConstraints={{ deviceId: selectedDeviceId }} />
          <button onClick={() => setCameraEnabled(false)} className="customscanner-btn">Stop Camera</button>
        </div>
      )}

      <h2 className="customscanner-items-title">All Items</h2>
      <ul className="customscanner-item-list">
        {items.map(item => (
          <li key={item.id} className="customscanner-item">
            {item.text} - Barcode: {item.barcode} - Quantity: {item.quantity} - College: {item.college} - Category: {item.category}
            
            <svg 
              id={`barcode-${item.id}`} 
              style={{ cursor: 'pointer', width: '150px', height: 'auto', display: 'inline-block' }} 
            ></svg>

            <button 
              onClick={() => saveBarcodeImage(item.barcode, item.college)} 
              className="customscanner-btn"
            >
              Save Barcode Image
            </button>
          </li>
        ))}
      </ul>

      <button onClick={() => setShowDeletedLogs(!showDeletedLogs)} className="customscanner-btn">
        {showDeletedLogs ? 'Hide Deleted Items Log' : 'Show Deleted Items Log'}
      </button>

      {showDeletedLogs && (
        <div>
          <h2 className="customscanner-deleted-logs-title">Deleted Items Log</h2>
          <ul className="customscanner-deleted-log-list">
            {deletedLogs.map((log, index) => (
              <li key={index} className="customscanner-log-item">
                {log.text} - Barcode: {log.barcode} - Deleted At: {log.deletedAt}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Scanner;
