import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, updateDoc, doc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db, storage } from '../firebase/firebase-config'; 
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'; 
import emailjs from 'emailjs-com';
import './ApproveRequest.css';

const categories = ["Equipment", "Office Supplies", "Books", "Electrical parseInt"];
const nonAcademicOptions = [
  "FINANCE OFFICE", "OFFICE OF THE PRESIDENT", "HUMAN RESOURCE", "LIBRARY", "MANAGEMENT INFORMATION SYSTEM",
  "OFFICE OF THE REGISTRAR", "OFFICE OF THE STUDENT AFFAIRS AND SERVICES", "RESEARCH AND CREATIVE WORKS",
  "ACCOUNTING", "CLINIC", "GUIDANCE OFFICE", "NATIONAL SERVICE TRAINING PROGRAM",
];
const academicColleges = [
  "COLLEGE OF ARTS AND SCIENCES", "COLLEGE OF BUSINESS ADMINISTRATION",
  "COLLEGE OF COMPUTER STUDIES", "COLLEGE OF CRIMINOLOGY", "COLLEGE OF EDUCATION",
  "COLLEGE OF ENGINEERING", "BED"
];

const academicPrograms = {
  "COLLEGE OF ARTS AND SCIENCES": [
    "Bachelor Of Arts In English Language",
    "Bachelor Of Arts In Political Science",
    "Batsilyer Ng Sining Sa Filipino / Bachelor Of Arts In Filipino"
  ],
  "COLLEGE OF BUSINESS ADMINISTRATION": [
    "Bachelor Of Science In Business Administration Major In Marketing Management",
    "Bachelor Of Science In Business Administration Major In Operation Management",
    "Bachelor Of Science In Business Administration Major In Financial Management",
    "Bachelor Of Science In Business Administration Major In Human Resource Management"
  ],
  "COLLEGE OF COMPUTER STUDIES": [
    "BS Computer Science",
    "BS Information Technology"
  ],
  "COLLEGE OF CRIMINOLOGY": [],
  "COLLEGE OF EDUCATION": [
    "Bachelor In Elementary Education",
    "Bachelor In Secondary Education Major In English",
    "Bachelor In Secondary Education Major In Filipino",
    "Bachelor In Secondary Education Major In Math"
  ],
  "COLLEGE OF ENGINEERING": [
    "Bachelor Of Science In Civil Engineering",
    "Bachelor Of Science In Electrical Engineering",
    "Bachelor Of Science In Mechanical Engineering",
    "Bachelor Of Science In Electronics Engineering",
    "Bachelor Of Science In Computer Engineering"
  ],
  "BED": [
    "JUNIOR HIGH SCHOOL",
    "SENIOR HIGH SCHOOL ACCOUNTANCY, BUSINESS & MANAGEMENT (ABM)",
    "SENIOR HIGH SCHOOL HUMANITIES & SOCIAL SCIENCES (HUMSS)",
    "SENIOR HIGH SCHOOL SCIENCE, TECHNOLOGY, ENGINEERING, AND MATHEMATICS (STEM)"
  ]
};

const ApproveRequest = () => {
  const [requestDetails, setRequestDetails] = useState({
    itemName: [],
    category: '',
    uniqueId: '',
    college: '',
    department: '',
    program: '',
    requestDate: '',
    requestPurpose: '',
    supplierName: '',
    approved: false,
    imageUrl: '',
    specificType: ''
  });

  const [requests, setRequests] = useState([]);
  const [editingRequest, setEditingRequest] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [viewMode, setViewMode] = useState('allFolders');
  const [openFolders, setOpenFolders] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentRequest, setCurrentRequest] = useState(null);
  const [formData, setFormData] = useState({ purchaseDate: '', requestorEmail: '', requestorPhone: '' });
  const [itemQuantities, setItemQuantities] = useState({});
  const [itemAmounts, setItemAmounts] = useState({}); // State for item amounts
  const [imagePreview, setImagePreview] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
 const [cameraDevices, setCameraDevices] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const videoRef = useRef(null);

  // Fetch requests from Firestore
  useEffect(() => {
    const requestCollection = collection(db, 'requests');
    const unsubscribe = onSnapshot(requestCollection, (snapshot) => {
      const fetchedRequests = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRequests(fetchedRequests);
    });
    return () => unsubscribe();
  }, []);

  // Get available camera devices
  useEffect(() => {
    const getCameraDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setCameraDevices(videoDevices);
        if (videoDevices.length > 0) {
          setSelectedCamera(videoDevices[0].deviceId); // Default to the first camera
        } else {
          setErrorMessage('No camera devices found.');
        }
      } catch (error) {
        console.error('Error fetching camera devices:', error);
        setErrorMessage('Failed to access camera devices.');
      }
    };
    getCameraDevices();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setRequestDetails((prev) => ({ ...prev, [name]: value }));
    setErrorMessage('');
  };

  const handleItemChange = (index, field, value) => {
    const newItemNames = [...requestDetails.itemName];
    newItemNames[index] = { ...newItemNames[index], [field]: value };
    setRequestDetails((prev) => ({ ...prev, itemName: newItemNames }));
  };

  const addItem = () => {
    setRequestDetails((prev) => ({
      ...prev,
      itemName: [...prev.itemName, { name: '', quantity: '', purchasedQuantity: 0, totalAmount: 0 }]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isDuplicate = requests.some(
      (request) => request.uniqueId === requestDetails.uniqueId && request.id !== editingRequest?.id
    );
    if (isDuplicate) {
      setErrorMessage('Error: Request Number (Unique ID) must be unique.');
      return;
    }

    await submitRequest();
    resetForm();
  };

  const submitRequest = async () => {
    try {
      const generatedUniqueId = `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      if (editingRequest) {
        const requestRef = doc(db, 'requests', editingRequest.id);
        await updateDoc(requestRef, {
          ...requestDetails,
          uniqueId: editingRequest.uniqueId,
          requestDate: new Date(requestDetails.requestDate).getTime(),
        });
        setEditingRequest(null);
      } else {
        await addDoc(collection(db, 'requests'), {
          ...requestDetails,
          uniqueId: generatedUniqueId,
          requestDate: new Date(requestDetails.requestDate).getTime(),
          requestorEmail: formData.requestorEmail,
          approved: false,
        });
      }
      resetForm();
    } catch (error) {
      setErrorMessage('Error submitting request: ' + error.message);
    }
  };

  const resetForm = () => {
    setRequestDetails({
      itemName: [],
      category: '',
      uniqueId: '',
      college: '',
      department: '',
      program: '',
      requestDate: '',
      requestPurpose: '',
      supplierName: '',
      approved: false,
      imageUrl: '',
      specificType: ''
    });
    setEditingRequest(null);
    setErrorMessage('');
    setImagePreview('');
    setItemQuantities({});
    setItemAmounts({});

    const imageInput = document.getElementById('imageInput');
    if (imageInput) {
      imageInput.value = '';
    }
  };

  const deleteRequest = async (id) => {
    try {
      await deleteDoc(doc(db, 'requests', id));
    } catch (error) {
      setErrorMessage('Error deleting request: ' + error.message);
    }
  };

  const toggleFolder = (folder) => {
    setOpenFolders(prev => ({ ...prev, [folder]: !prev[folder] }));
  };

  const groupedRequests = () => {
    return requests.reduce((acc, request) => {
      if (!acc[request.college]) {
        acc[request.college] = {};
      }
      if (!acc[request.college][request.category]) {
        acc[request.college][request.category] = [];
      }
      acc[request.college][request.category].push(request);
      return acc;
    }, {});
  };

  const renderRequestsByFolder = (folderName) => {
    const requestsByCollege = groupedRequests();

    return Object.keys(requestsByCollege).map((college) => (
      college === folderName && (
        <div key={college} className="college-section">
          <h3 onClick={() => toggleFolder(college)}>
            {college} {openFolders[college] ? '[-]' : '[+]'}
          </h3>
          {openFolders[college] && (
            <>
              {Object.keys(requestsByCollege[college]).map((category) => (
                <div key={category} className="category-section">
                  <h4>{category}</h4>
                  <ul>
                    {requestsByCollege[college][category].filter(request => !request.approved).map((request) => (
                      <li key={request.id}>
                        <div>
                          <p><strong>Unique ID:</strong> {request.uniqueId}</p>
                          <strong>Requested Items:</strong>
                          <ul>
                            {Array.isArray(request.itemName) && request.itemName.length > 0 ? (
                              request.itemName.map((item, index) => {
                                const itemRequested = parseInt(item.quantity || 0, 10);
                                const itemPurchased = parseInt(item.purchasedQuantity || 0, 10);
                                const totalAmount = parseFloat(item.totalAmount) || 0; // Ensure totalAmount is a number

                                return (
                                  <li key={index}>
                                    {item.name} - 
                                    <span> {itemRequested} requested,</span> 
                                    <span> {itemPurchased} purchased,</span> 
                                    <span> Amount: {totalAmount.toFixed(2)}</span> {/* Display totalAmount with two decimal places */}
                                  </li>
                                );
                              })
                            ) : (
                              <li>No items available</li>
                            )}
                          </ul>
                          <p><strong>Request Purpose:</strong> {request.requestPurpose}</p>
                          <p><strong>Supplier Name:</strong> {request.supplierName}</p>
                          <p><strong>Request Date:</strong> {new Date(request.requestDate).toLocaleDateString()}</p>
                          <p><strong>Category:</strong> {request.category}</p>
                          <p><strong>Main Category:</strong> {request.college}</p>
                          <p><strong>Subcategory:</strong> {request.department}</p>
                          <p><strong>Specific Type:</strong> {request.specificType || 'N/A'}</p>
                          <p><strong>Academic Program:</strong> {request.program || 'N/A'}</p>
                          {request.imageUrl && (
                            <div className="image-preview">
                              <h4>Uploaded Image:</h4>
                              <img src={request.imageUrl} alt="Uploaded" />
                            </div>
                          )}
                          <button onClick={() => deleteRequest(request.id)}>Delete</button>
                          {!request.approved && (
                            <>
                              <button onClick={() => openModal(request)}>More</button>
                              <button onClick={() => {
                                setEditingRequest(request);
                                setRequestDetails({
                                  itemName: request.itemName,
                                  category: request.category,
                                  uniqueId: request.uniqueId,
                                  college: request.college,
                                  department: request.department,
                                  program: request.program,
                                  requestDate: new Date(request.requestDate).toISOString().substring(0, 10),
                                  requestPurpose: request.requestPurpose,
                                  supplierName: request.supplierName,
                                  imageUrl: request.imageUrl,
                                  specificType: request.specificType
                                });
                              }}>Edit</button>
                            </>
                          )}
                        </div>
                      </li>
                    ))}
                    {requestsByCollege[college][category].filter(request => request.approved).map((request) => (
                      <li key={request.id}>
                        <div>
                          <p><strong>Unique ID:</strong> {request.uniqueId}</p>
                          <strong>Requested Items:</strong>
                          <ul>
                            {Array.isArray(request.itemName) && request.itemName.length > 0 ? (
                              request.itemName.map((item, index) => {
                                const itemRequested = parseInt(item.quantity || 0, 10);
                                const itemPurchased = parseInt(item.purchasedQuantity || 0, 10);
                                const totalAmount = parseFloat(item.totalAmount) || 0; // Ensure totalAmount is a number
                                const finalNotPurchased = itemRequested - itemPurchased;

                                return (
                                  <li key={index}>
                                    {item.name} - 
                                    <span> {itemRequested} requested,</span> 
                                    <span> { itemPurchased} purchased,</span> 
                                    <span> {finalNotPurchased} not purchased,</span>
                                    <span> Amount: {totalAmount.toFixed(2)}</span>
                                  </li>
                                );
                              })
                            ) : (
                              <li>No items available</li>
                            )}
                          </ul>
                          <p><strong>Request Purpose:</strong> {request.requestPurpose}</p>
                          <p><strong>Supplier Name:</strong> {request.supplierName}</p>
                          <p><strong>Request Date:</strong> {new Date(request.requestDate).toLocaleDateString()}</p>
                          <p><strong>Category:</strong> {request.category}</p>
                          <p><strong>Main Category:</strong> {request.college}</p>
                          <p><strong>Subcategory:</strong> {request.department}</p>
                          <p><strong>Specific Type:</strong> {request.specificType || 'N/A'}</p>
                          <p><strong>Academic Program:</strong> {request.program || 'N/A'}</p>
                          {request.imageUrl && (
                            <div className="image-preview">
                              <h4>Uploaded Image:</h4>
                              <img src={request.imageUrl} alt="Uploaded" />
                            </div>
                          )}
                          <button onClick={() => deleteRequest(request.id)}>Delete</button>
                          {!request.approved && (
                            <>
                              <button onClick={() => openModal(request)}>More</button>
                              <button onClick={() => {
                                setEditingRequest(request);
                                setRequestDetails({
                                  itemName: request.itemName,
                                  category: request.category,
                                  uniqueId: request.uniqueId,
                                  college: request.college,
                                  department: request.department,
                                  program: request.program,
                                  requestDate: new Date(request.requestDate).toISOString().substring(0, 10),
                                  requestPurpose: request.requestPurpose,
                                  supplierName: request.supplierName,
                                  imageUrl: request.imageUrl,
                                  specificType: request.specificType
                                });
                              }}>Edit</button>
                            </>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                  <p><strong>Total Amount:</strong> {requestsByCollege[college][category].reduce((total, request) => {
                    return total + request.itemName.reduce((itemTotal, item) => {
                      const itemTotalAmount = parseFloat(item.totalAmount) || 0; // Default to 0 if undefined
                      return itemTotal + itemTotalAmount; // Ensure it's a number
                    }, 0);
                  }, 0).toFixed(2)}</p>
                </div>
              ))}
            </>
          )}
        </div>
      )
    ));
  };

  const openModal = (request) => {
    setCurrentRequest(request);
    setItemQuantities({});
    setItemAmounts({});
    setFormData({ purchaseDate: '', requestorEmail: '', requestorPhone: '' });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentRequest(null);
  };

  const handleQuantityChange = (itemName, value) => {
    setItemQuantities((prev) => ({
      ...prev,
      [itemName]: value
    }));
  };

  const handleAmountChange = (itemName, value) => {
    const amount = parseFloat(value) || 0; // Ensure it's a number
    setItemAmounts((prev) => ({
      ...prev,
      [itemName]: amount
    }));
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();

    const itemsUpdated = currentRequest.itemName.map(item => {
      const purchasedQuantity = itemQuantities[item.name] || 0;
      const totalAmount = itemAmounts[item.name] || 0;
      const remainingQuantity = item.quantity - purchasedQuantity;
      const status = remainingQuantity === 0 ? '✔️' : (purchasedQuantity > 0 ? '✔' : '✔');
      return { 
        ...item, 
        purchasedQuantity: purchasedQuantity,
        quantity: item.quantity, 
        totalAmount: totalAmount,
        status 
      };
    });

    const requestRef = doc(db, 'requests', currentRequest.id);
    
    const allItemsDone = itemsUpdated.some(item => item.purchasedQuantity > 0);

    try {
      await updateDoc(requestRef, {
        itemName: itemsUpdated,
        approved: allItemsDone
      });

      const templateParams = {
        to_email: currentRequest.requestorEmail || 'walleenates808@gmail.com',
        items: itemsUpdated.map(item => `${item.name} (Requested: ${item.quantity}, Purchased: ${item.purchasedQuantity}, Amount: ${item.totalAmount}, Status: ${item.status})`).join(', '),
        action: 'Purchased',
        purchaseDate: formData.purchaseDate,
        requestPurpose: currentRequest.requestPurpose,
        college: currentRequest.college,
        department: currentRequest.department,
        uniqueId: currentRequest.uniqueId,
      };

      await emailjs.send('service_bl8cece', 'template_2914ned', templateParams, 'BMRt6JigJjznZL-FA');

      closeModal();
    } catch (error) {
      setErrorMessage('Error processing request or sending email: ' + error.message);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const storageRef = ref(storage, `images/${file.name}`);
      try {
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        setImagePreview(downloadURL);
        setRequestDetails((prev) => ({
          ...prev,
          imageUrl: downloadURL,
        }));
      } catch (error) {
        setErrorMessage('Error uploading file: ' + error.message);
      }
    }
  };

  const startCamera = async (deviceId) => {
    try {
      const constraints = {
        video: { deviceId: { exact: deviceId } },
      };

      if (videoRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);
      setErrorMessage('');
    } catch (error) {
      console.error('Error starting camera:', error);
      setErrorMessage('Failed to access the camera: ' + error.message);
    }
  };

  const captureImage = () => {
    const canvas = document.createElement('canvas');
    const video = videoRef.current;

    if (!video) {
      setErrorMessage("Camera is not active.");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL('image/png');
    setImagePreview(imageData);
    setRequestDetails(prev => ({ ...prev, imageUrl: imageData }));

    stopCamera();
  };

  const handleCameraChange = (e) => {
    const newDeviceId = e.target.value;
    setSelectedCamera(newDeviceId);
    startCamera(newDeviceId);
  };

  const stopCamera = () => {
    const video = videoRef.current;
    if (video?.srcObject) {
      const tracks = video.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
      video.srcObject = null;
    }
    setCameraActive(false);
  };

  const handleFormDataChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="approve-request">
      <h1>Approved Requests</h1>
      {errorMessage && <p className="error-message">{errorMessage}</p>}
      <div className="view-mode-section">
        <label>
          View Mode: 
          <select value={viewMode} onChange={(e) => setViewMode(e.target.value)}>
            <option value="allFolders">All Folders</option>
            <option value="nonAcademic">Non Academic Folder</option>
            <option value="academic">Academic Folder</option>
          </select>
        </label>
      </div>

      <form onSubmit={handleSubmit}>
        <label>
          Add Item Name: 
          <button type="button" onClick={addItem}>Add Item</button>
        </label>
        {requestDetails.itemName.map((item, index) => (
          <div key={index}>
            <input 
              type="text" 
              placeholder="Item Name" 
              value={item.name} 
              onChange={(e) => handleItemChange(index, 'name', e.target.value)} 
              required 
            />
            <input 
              type="number" 
              placeholder="Quantity" 
              value={item.quantity} 
              onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} 
              required 
            />
          </div>
        ))}
        <label>
          Request Purpose: 
          <input 
            type="text" 
            name="requestPurpose" 
            value={requestDetails.requestPurpose} 
            onChange={handleInputChange} 
            required />
        </label>
        <label>
          Supplier Name: 
          <input 
            type="text" 
            name="supplierName" 
            value={requestDetails.supplierName} 
            onChange={handleInputChange} 
            required 
          />
        </label>
        <label>
          Category: 
          <select name="category" value={requestDetails.category} onChange={handleInputChange}>
            <option value="">Select Category</option>
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </label>
        {requestDetails.category && (
          <label>
            Specific Type: 
            <input 
              type="text" 
              name="specificType" 
              value={requestDetails.specificType} 
              onChange={handleInputChange} 
              placeholder="Specify type for selected category" 
            />
          </label>
        )}
        <label>
          Main Category: 
          <select name="college" value={requestDetails.college} onChange={handleInputChange}>
            <option value="">Select Main Category</option>
            <option value="Non Academic">Non Academic</option>
            <option value="Academic">Academic</option>
          </select>
        </label>
        {requestDetails.college === "Non Academic" && (
          <label>
            Subcategory: 
            <select name="department" value={requestDetails.department} onChange={handleInputChange}>
              <option value="">Select Non Academic Subcategory</option>
              {nonAcademicOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
        )}
        {requestDetails.college === "Academic" && (
          <>
            <label>
              College: 
              <select name="department" value={requestDetails.department} onChange={handleInputChange}>
                <option value="">Select Academic College</option>
                {academicColleges.map(college => (
                  <option key={college} value={college}>{college}</option>
                ))}
              </select>
            </label>
            {requestDetails.department && academicPrograms[requestDetails.department] && academicPrograms[requestDetails.department].length > 0 && (
              <label>
                Academic Program: 
                <select name="program" value={requestDetails.program} onChange={handleInputChange}>
                  <option value="">Select Academic Program</option>
                  {academicPrograms[requestDetails.department].map(program => (
                    <option key={program} value={program}>{program}</option>
                  ))}
                </select>
              </label>
            )}
          </>
        )}
        <label>
          Request Date: 
          <input 
            type="date" 
            name="requestDate" 
            value={requestDetails.requestDate} 
            onChange={handleInputChange} 
            required 
          />
        </label>
        <div className="image-upload-section">
          <h3>Upload Image</h3>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            id="imageInput"
          />
        </div>

        <div className="camera-section">
          <h3>Select Camera</h3>
          <select onChange={handleCameraChange} value={selectedCamera}>
            {cameraDevices.map(device => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Camera ${device.deviceId}`}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => startCamera(selectedCamera)}
            disabled={cameraActive || cameraDevices.length === 0}
          >
            Open Camera
          </button>

          {cameraActive && (
            <div className="camera-preview">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: 'auto', border: '1px solid #ccc' }}
              />
              <div className="camera-controls">
                <button type="button" onClick={captureImage}>Capture</button>
                <button type="button" onClick={stopCamera}>Stop Camera</button>
              </div>
            </div>
          )}
        </div>

        {imagePreview && (
          <div className="image-preview">
            <h4>Preview:</h4>
            <img src={imagePreview} alt="Captured" style={{ maxWidth: '100%', border: '1px solid #ddd', padding: '5px' }} />
          </div>
        )}

        <button type="submit">{editingRequest ? "Update Request" : "Submit Request"}</button>
      </form>

 <h2>Submitted Requests</h2>
      {requests.length > 0 ? (
        <div>
          {viewMode === 'nonAcademic' && renderRequestsByFolder('Non Academic')}
          {viewMode === 'academic' && renderRequestsByFolder('Academic')}
          {viewMode === 'allFolders' && (
            <>
              {renderRequestsByFolder('Non Academic')}
              {renderRequestsByFolder('Academic')}
            </>
          )}
        </div>
      ) : (
        <p>No requests submitted yet.</p>
      )}

      {isModalOpen && currentRequest && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Process Request</h2>
            <h3>Requested Items:</h3>
            <ul>
              {Array.isArray(currentRequest.itemName) && currentRequest.itemName.length > 0 ? (
                currentRequest.itemName.map((item, index) => {
                  const purchasedQuantity = itemQuantities[item.name] || 0;
                  const remainingQuantity = item.quantity - purchasedQuantity < 0 ? 0 : item.quantity - purchasedQuantity;
                  return (
                    <li key={index}>
                      {item.name} (Total Quantity: {item.quantity}, Purchased: {purchasedQuantity}, Remaining: {remainingQuantity})
                      <input 
                        type="number" 
                        placeholder="Enter Quantity Purchased" 
                        onChange={(e) => handleQuantityChange(item.name, e.target.value)} 
                      />
                      <input 
                        type="number" 
                        placeholder="Enter Total Amount" 
                        onChange={(e) => handleAmountChange(item.name, e.target.value)} 
                      />
                    </li>
                  );
                })
              ) : (
                <li>No items available</li>
              )}
            </ul>

            <form onSubmit={handleEmailSubmit}>
              <label>
                Date of Purchase:
                <input
                  type="date"
                  name="purchaseDate"
                  value={formData.purchaseDate || new Date().toISOString().split('T')[0]}
                  onChange={handleFormDataChange}
                  required
                />
              </label>
              <label>
                Requestor Email:
                <input type="email"
                  name="requestorEmail"
                  value={formData.requestorEmail}
                  onChange={handleFormDataChange}
                  required
                />
              </label>
              <label>
                Requestor's Phone:
                <input
                  type="tel"
                  name="requestorPhone"
                  value={formData.requestorPhone}
                  onChange={handleFormDataChange}
                  required
                />
              </label>
              <button type="submit">Submit</button>
              <button type="button" onClick={closeModal}>Cancel</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApproveRequest;