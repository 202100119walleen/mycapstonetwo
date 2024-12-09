import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';

const WebcamCapture = ({ requestId, editMode, onCapture }) => {
  const webcamRef = useRef(null);
  const [imgSrc, setImgSrc] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  useEffect(() => {
    const getMediaDevices = async () => {
      try {
        const mediaDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = mediaDevices.filter(device => device.kind === 'videoinput');
        setDevices(videoDevices);
        if (videoDevices.length > 0) {
          setSelectedDeviceId(videoDevices[0].deviceId); // Select the first camera by default
        }
      } catch (error) {
        console.error("Error accessing media devices.", error);
      }
    };

    getMediaDevices();
  }, []);

  const capture = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    setImgSrc(imageSrc);
    onCapture(imageSrc); // Call the onCapture function passed as a prop
  };

  const handleDeviceChange = (e) => {
    setSelectedDeviceId(e.target.value);
  };

  const handleRetake = () => {
    setImgSrc(null);
  };

  return (
    <div>
      <select
        value={selectedDeviceId}
        onChange={handleDeviceChange}
        disabled={!editMode}
      >
        {devices.map(device => (
          <option key={device.deviceId} value={device.deviceId}>
            {device.label || `Camera ${devices.indexOf(device) + 1}`}
          </option>
        ))}
      </select>

      {imgSrc ? (
        <div>
          <img src={imgSrc} alt="Captured" style={{ width: '100%', height: 'auto' }} />
          <button onClick={handleRetake} disabled={!editMode}>
            Retake Image
          </button>
        </div>
      ) : (
        <Webcam
          audio={false}
          ref={webcamRef}
          screenshotFormat="image/jpeg"
          width={600}
          height={400}
          videoConstraints={{
            deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
          }}
        />
      )}

      <div className="btn-container">
        <button onClick={capture} disabled={!editMode}>
          Capture Image
        </button>
      </div>
    </div>
  );
};

export default WebcamCapture;