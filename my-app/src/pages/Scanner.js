import React, { useEffect, useRef, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebase-config';


const Scanner = () => {
  const [submittedItems, setSubmittedItems] = useState([]);
  const [error, setError] = useState('');
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const videoRef = useRef(null);

  useEffect(() => {
    const fetchCameras = async () => {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setCameras(videoDevices);
      if (videoDevices.length > 0) {
        setSelectedCamera(videoDevices[0].deviceId); // Select the first camera by default
      }
    };

    fetchCameras();
  }, []);

  const handleScan = async (scannedData) => {
    try {
      const requestsCollection = collection(db, 'requests');
      const snapshot = await getDocs(requestsCollection);
      const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const scannedRequest = requests.find(request => request.uniqueId === scannedData);
      if (scannedRequest) {
        setSubmittedItems(requests); // Store all submitted items
      } else {
        setError('No request found with this barcode.');
      }
    } catch (err) {
      setError('Error fetching requests: ' + err.message);
    }
  };

  const startScanning = () => {
    // Start the video stream with the selected camera
    const constraints = {
      video: { deviceId: selectedCamera ? { exact: selectedCamera } : undefined }
    };
    navigator.mediaDevices.getUserMedia(constraints)
      .then(stream => {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      })
      .catch(err => {
        setError('Error accessing camera: ' + err.message);
      });
  };

  return (
    <div className="scanner">
      <h2>Scan Barcode</h2>
      {error && <p className="error-message">{error}</p>}
      <video ref={videoRef} style={{ width: '100%' }} />
      <select onChange={(e) => setSelectedCamera(e.target.value)} value={selectedCamera}>
        {cameras.map(camera => (
          <option key={camera.deviceId} value={camera.deviceId}>
            {camera.label || `Camera ${camera.deviceId}`}
          </option>
        ))}
      </select>
      <button onClick={startScanning}>Start Scanning</button>

      {submittedItems.length > 0 && (
        <div className="submitted-items">
          <h3>Submitted Items</h3>
          <table>
            <thead>
              <tr>
                <th>Unique ID</th>
                <th>Item Name</th>
                <th>Purchased Quantity</th>
                <th>Supplier Name</th>
                <th>Category</th>
                <th>Department</th>
                <th>Program</th>
                <th>Request Date</th>
                <th>Request Purpose</th>
                <th>Specific Type</th>
                <th>Date Delivered</th>
              </tr>
            </thead>
            <tbody>
              {submittedItems.map(item => (
                <tr key={item.id}>
                  <td>{item.uniqueId}</td>
                  <td>{item.itemName}</td>
                  <td>{item.purchasedQuantity}</td>
                  <td>{item.supplierName}</td>
                  <td>{item.category}</td>
                  <td>{item.department}</td>
                  <td>{item.program}</td>
                  <td>{item.requestDate}</td>
                  <td>{item.requestPurpose}</td>
                  <td>{item.specificType}</td>
                  <td>{item.dateDelivered}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Scanner;