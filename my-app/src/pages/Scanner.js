import React, { useEffect, useState, useRef } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/firebase-config';
import JsBarcode from 'jsbarcode';
import { BrowserMultiFormatReader } from '@zxing/library';
import './Scanner.css'; // Adjust the path based on your project structure

const ScannerPage = () => {
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState([]);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [showCameraSelection, setShowCameraSelection] = useState(false);
  const videoRef = useRef(null);
  const reader = useRef(new BrowserMultiFormatReader());

  // Fetch items from Firestore
  useEffect(() => {
    const requestCollection = collection(db, 'requests');
    const unsubscribe = onSnapshot(
      requestCollection,
      (snapshot) => {
        const fetchedItems = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setItems(fetchedItems);
        setFilteredItems(fetchedItems);
        setError(null);
      },
      (error) => {
        console.error("Error fetching items:", error);
        setError("Failed to fetch items. Please try again later.");
      }
    );
    return () => unsubscribe();
  }, []);

  // Generate barcodes for items
  useEffect(() => {
    items.forEach((item) => {
      JsBarcode(`#barcode-${item.id}`, item.uniqueId, {
        format: 'CODE128',
        displayValue: true,
      });
    });
  }, [items]);

  // Fetch available video devices (cameras)
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const availableDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = availableDevices.filter(device => device.kind === 'videoinput');
        setDevices(videoDevices);
        if (videoDevices.length > 0) {
          setSelectedDeviceId(videoDevices[0].deviceId); // Select the first available camera by default
        } else {
          setError("No video input devices found. Please connect a camera.");
        }
      } catch (error) {
        console.error("Error fetching devices:", error);
        setError("Failed to fetch camera devices. Please check your permissions.");
      }
    };
    fetchDevices();
  }, []);

  // Handle search functionality
  const handleSearch = () => {
    if (searchQuery.trim() === '') {
      // If the search query is empty, reset to show all items
      setFilteredItems(items);
    } else {
      // Filter items based on the search query
      const results = items.filter(item =>
        item.uniqueId && item.uniqueId.includes(searchQuery)
      );
      setFilteredItems(results);
    }
  };

  // Start scanning barcodes
  const startScanning = () => {
    if (videoRef.current && selectedDeviceId) {
      reader.current.decodeFromVideoDevice(selectedDeviceId, videoRef.current, (result, error) => {
        if (result) {
          const scannedBarcode = result.getText();
          const results = items.filter(item =>
            item.barcode && item.barcode.includes(scannedBarcode)
          );
          setFilteredItems(results);
        }
        if (error) {
          console.error(error);
        }
      });
    } else {
      setError("Video element or selected device is not available.");
    }
  };

  // Copy unique ID to clipboard
  const copyToClipboard = (uniqueId) => {
    navigator.clipboard.writeText(uniqueId)
      .then(() => {
        alert(`Copied: ${uniqueId}`);
      })
      .catch(err => {
        console.error("Failed to copy: ", err);
      });
  };

  // Download barcode as an image
  const downloadBarcode = (id) => {
    const canvas = document.getElementById(`barcode-${id}`);
    if (canvas) {
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `barcode-${id}.png`;
      link.click();
    } else {
      console.error("Barcode canvas not found.");
    }
  };

  return (
    <div>
      <h1>Scanner Page</h1>
      {error && <p className="error">{error}</p>}
      <input
        type="text"
        placeholder="Search by Unique ID"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyUp={handleSearch}
      />
      <button onClick={startScanning}>Start Scanning</button>
      <button onClick={() => setShowCameraSelection(!showCameraSelection)}>
        {showCameraSelection ? 'Hide Camera Selection' : 'Select Camera'}
      </button>
      {showCameraSelection && (
        <select onChange={(e) => setSelectedDeviceId(e.target.value)} value={selectedDeviceId}>
          {devices.map(device => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Camera ${device.deviceId}`}
            </option>
          ))}
        </select>
      )}
      <table>
        <thead>
          <tr>
            <th>Unique ID</th>
            <th>Item Name</th>
            <th>Supplier Name</th>
            <th>Request Date</th>
            <th>Category</th>
            <th>Specific Type</th>
            <th>Department</th>
            <th>Barcode</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredItems.map((item) => (
            <tr key={item.id}>
              <td>{item.uniqueId || 'N/A'}</td>
              <td>{Array.isArray(item.itemName) ? item.itemName.map(i => i.name).join(', ') : 'N/A'}</td>
              <td>{item.supplierName || 'N/A'}</td>
              <td>{new Date(item.requestDate).toLocaleDateString() || 'N/A'}</td>
              <td>{item.category || 'N/A'}</td>
              <td>{item.specificType || 'N/A'}</td>
              <td>{item.department || 'N/A'}</td>
              <td>
                <canvas id={`barcode-${item.id}`}></canvas>
              </td>
              <td>
                <button onClick={() => copyToClipboard(item.uniqueId)}>Copy ID</button>
                <button onClick={() => downloadBarcode(item.id)}>Download Barcode</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <video ref={videoRef} style={{ display: 'none' }} />
    </div>
  );
};

export default ScannerPage;