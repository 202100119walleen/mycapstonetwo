import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, updateDoc, doc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db, storage } from '../firebase/firebase-config'; // Import storage
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'; // Import storage functions
import emailjs from 'emailjs-com';
import './ApproveRequest.css';

const categories = ["Equipment", "Office Supplies", "Books", "Electrical Parts"];
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
    itemName: '',
    category: '',
    uniqueId: '',
    college: '',
    department: '',
    program: '',
    requestDate: '',
    requestPurpose: '',
    supplierName: '',
    quantity: '',
    approved: false,
    imageUrl: '',
    specificType: '' // New field for specific type based on category
  });

  const [requests, setRequests] = useState([]);
  const [editingRequest, setEditingRequest] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [viewMode, setViewMode] = useState('allFolders');
  const [openFolders, setOpenFolders] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentRequest, setCurrentRequest] = useState(null);
  const [formData, setFormData] = useState({ purchaseDate: '', requestorEmail: '', requestorPhone: '' });
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [imagePreview, setImagePreview] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [videoConstraints, setVideoConstraints] = useState({ facingMode: 'user' }); // Default to user camera
  const videoRef = useRef(null); // Reference for the video element

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setRequestDetails((prev) => ({ ...prev, [name]: value }));
    setErrorMessage('');
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
    resetForm(); // This will reset the form and the image upload
  };

  const submitRequest = async () => {
    try {
      if (editingRequest) {
        const requestRef = doc(db, 'requests', editingRequest.id);
        await updateDoc(requestRef, {
          ...requestDetails,
          requestDate: new Date(requestDetails.requestDate).getTime(),
        });
        setEditingRequest(null);
      } else {
        await addDoc(collection(db, 'requests'), {
          ...requestDetails,
          requestDate: new Date(requestDetails.requestDate).getTime(),
          requestorEmail: formData.requestorEmail,
          approved: false,
        });
      }
      resetForm();
    } catch (error) {
      setErrorMessage('Error submitting request.');
    }
  };

  const resetForm = () => {
    setRequestDetails({
      itemName: '',
      category: '',
      uniqueId: '',
      college: '',
      department: '',
      program: '',
      requestDate: '',
      requestPurpose: '',
      supplierName: '',
      quantity: '',
      approved: false,
      imageUrl: '',
      specificType: '' // Reset specific type
    });
    setEditingRequest(null);
    setErrorMessage('');
    setImagePreview(''); // Reset image preview

    const imageInput = document.getElementById('imageInput');
    if (imageInput) {
      imageInput.value = ''; // Reset file input
    }
  };

  const deleteRequest = async (id) => {
    try {
      await deleteDoc(doc(db, 'requests', id));
    } catch (error) {
      setErrorMessage('Error deleting request.');
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
                    {requestsByCollege[college][category].map((request) => (
                      <li key={request.id}>
                        <div>
                          <p><strong>Request Purpose:</strong> {request.requestPurpose}</p>
                          <p><strong>Supplier Name:</strong> {request.supplierName}</p>
                          <p><strong>Quantity:</strong> {request.quantity}</p>
                          <p><strong>Category:</strong> {request.category}</p>
                          <p><strong>Main Category:</strong> {request.college}</p>
                          <p><strong>Subcategory:</strong> {request.department}</p>
                          <p><strong>Specific Type:</strong> {request.specificType || 'N/A'}</p>
                          <p><strong>Academic Program:</strong> {request.program || 'N/A'}</p>
                          <p><strong>Request Date:</strong> {new Date(request.requestDate).toLocaleDateString()}</p>
                          <p><strong>Unique ID:</strong> {request.uniqueId}</p>
                          <strong>Requested Items:</strong>
                          <ul>
                            {Array.isArray(request.itemName)
                              ? request.itemName.map(item => (
                                  <li key={item}>
                                    {item} {request.approved ? '✔️' : '❌'}
                                  </li>
                                ))
                              : request.itemName.split(',').map(item => (
                                  <li key={item.trim()}>
                                    {item.trim()} {request.approved ? '' : ''} 
                                  </li>
                                ))
                            }
                          </ul>
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
                                  quantity: request.quantity,
                                  imageUrl: request.imageUrl, // Set imageUrl for editing
                                  specificType: request.specificType // Set specific type for editing
                                });
                              }}>Edit</button>
                            </>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
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
    setSelectedAction('');
    setSelectedItems([]);
    setFormData({ purchaseDate: '', requestorEmail: '', requestorPhone: '' });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentRequest(null);
  };

  const handleActionChange = (action) => {
    setSelectedAction(action);
  };

  const handleItemClick = (item) => {
    setSelectedItems((prevItems) => {
      const newItems = prevItems.includes(item) ? prevItems.filter(i => i !== item) : [...prevItems, item];
      return newItems;
    });
  };

  const handleFormDataChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    const itemsUpdated = currentRequest.itemName.split(',').map(item => {
        if (selectedItems.includes(item.trim())) {
            return selectedAction === "Purchased" ? `${item.trim()} ✔️` : `${item.trim()} ❌`;
        }
        return item.trim();
    });

    const requestRef = doc(db, 'requests', currentRequest.id);
    
    const allItemsDone = itemsUpdated.every(item => item.includes('✔️') || item.includes('❌'));
    
    try {
        await updateDoc(requestRef, {
            itemName: itemsUpdated.join(', '),
            approved: allItemsDone
        });

        const templateParams = {
            to_email: currentRequest.requestorEmail || 'walleenates808@gmail.com',
            items: itemsUpdated.join(', '),
            action: selectedAction,
            purchaseDate: formData.purchaseDate,
            requestPurpose: currentRequest.requestPurpose,
            college: currentRequest.college,
            department: currentRequest.department,
            uniqueId: currentRequest.uniqueId
        };

        await emailjs.send('service_bl8cece', 'template_2914ned', templateParams, 'BMRt6JigJjznZL-FA');

        closeModal();
    } catch (error) {
        setErrorMessage('Error processing request or sending email.');
    }
};

const handleImageUpload = async (e) => {
  const file = e.target.files[0];
  if (file) {
    const storageRef = ref(storage, `images/${file.name}`);
    try {
      // Upload the file
      await uploadBytes(storageRef, file);

      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);

      setImagePreview(downloadURL);
      setRequestDetails((prev) => ({
        ...prev,
        imageUrl: downloadURL,
      }));
    } catch (error) {
      console.error ('Error uploading file:', error);
    }
  }
};

const startCamera = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints });
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play();
    }
    setCameraActive(true);
  } catch (err) {
    console.error('Camera access denied:', err);
  }
};

const toggleCamera = () => {
  setVideoConstraints((prev) => ({
    facingMode: prev.facingMode === 'user' ? 'environment' : 'user', // Toggle between user and environment camera
  }));
};

const captureImage = () => {
  const canvas = document.createElement('canvas');
  const video = videoRef.current;

  // Set the canvas dimensions to match the video
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  // Draw the current frame from the video onto the canvas
  canvas.getContext('2d').drawImage(video, 0, 0);

  // Get the image data from the canvas
  const imageData = canvas.toDataURL('image/png');

  // Set the image preview and update the request details with the image URL
  setImagePreview(imageData);
  setRequestDetails((prev) => ({
    ...prev,
    imageUrl: imageData,
  }));

  // Stop the camera after capturing the image
  stopCamera();
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

return (
  <div className="approve-request">
    <h1>Approve Requests</h1>
    {errorMessage && <p className="error-message">{errorMessage}</p>}
    <div className="view-mode-section">
      <label>
        View Mode: 
        <select value={viewMode} onChange={(e) => setViewMode(e.target.value)}>
          <option value="allFolders">All Folders</option>
          <option value="nonAcademic"> Non Academic Folder</option>
          <option value="academic">Academic Folder</option>
        </select>
      </label>
    </div>

    {/* Request Form */}
    <form onSubmit={handleSubmit}>
      <label>Unique ID: 
        <input type="text" name="uniqueId" value={requestDetails.uniqueId} onChange={handleInputChange} required />
      </label>
      <label>Item Name (separate by commas): 
        <input type="text" name="itemName" value={requestDetails.itemName} onChange={handleInputChange} required />
      </label>
      <label>Request Purpose: 
        <input type="text" name="requestPurpose" value={requestDetails.requestPurpose} onChange={handleInputChange} required />
      </label>
      <label>Supplier Name: 
        <input type="text" name="supplierName" value={requestDetails.supplierName} onChange={handleInputChange} required />
      </label>
      <label>Quantity: 
        <input type="number" name="quantity" value={requestDetails.quantity} onChange={handleInputChange} required />
      </label>
      <label>Category: 
        <select name="category" value={requestDetails.category} onChange={handleInputChange}>
          <option value="">Select Category</option>
          {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
        </select>
      </label>
      <label>Main Category: 
        <select name="college" value={requestDetails.college} onChange={handleInputChange}>
          <option value="">Select Main Category</option>
          <option value="Non Academic">Non Academic</option>
          <option value="Academic">Academic</option>
        </select>
      </label>
      {requestDetails.college === "Non Academic" && (
        <label>Subcategory: 
          <select name="department" value={requestDetails.department} onChange={handleInputChange}>
            <option value="">Select Non Academic Subcategory</option>
            {nonAcademicOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
      )}
      {requestDetails.college === "Academic" && (
        <>
          <label>College: 
            <select name="department" value={requestDetails.department} onChange={handleInputChange}>
              <option value="">Select Academic College</option>
              {academicColleges.map ((college) => (
                <option key={college} value={college}>{college}</option>
              ))}
            </select>
          </label>
          {requestDetails.department && academicPrograms[requestDetails.department] && academicPrograms[requestDetails.department].length > 0 && (
            <label>Academic Program: 
              <select name="program" value={requestDetails.program} onChange={handleInputChange}>
                <option value="">Select Academic Program</option>
                {academicPrograms[requestDetails.department].map((program) => (
                  <option key={program} value={program}>{program}</option>
                ))}
              </select>
            </label>
          )}
        </>
      )}
      <label>Request Date: 
        <input type="date" name="requestDate" value={requestDetails.requestDate} onChange={handleInputChange} required />
      </label>
      <label>Specific Type: 
        {requestDetails.category && (
          <input 
            type="text" 
            name="specificType" 
            value={requestDetails.specificType} 
            onChange={handleInputChange} 
            placeholder={`Enter specific type for ${requestDetails.category}`} 
          />
        )}
      </label>
      <div className="image-upload-section">
        <h3>Upload Image</h3>
        <input type="file" accept="image/*" onChange={handleImageUpload} />
      </div>
      <div className="camera-section">
        <h3>Capture Image</h3>
        <button type="button" onClick={startCamera} disabled={cameraActive}>
          Open Camera
        </button>
        {cameraActive && (
          <div className="camera-preview">
            <video ref={videoRef} autoPlay style={{ width: '100%' }} />
            <button type="button" onClick={captureImage}>Capture</button>
            <button type="button" onClick={stopCamera}>Cancel</button>
            <button type="button" onClick={toggleCamera}>Switch Camera</button>
          </div>
        )}
      </div>

      {/* Image Preview Section */}
      {imagePreview && (
        <div className="image-preview">
          <h4>Preview:</h4>
          <img src={imagePreview} alt="Uploaded or Captured" />
        </div>
      )}
      <button type="submit">{editingRequest ? 'Update Request' : 'Submit Request'}</button>
    </form>

    {/* Display Submitted Requests */}
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

    {/* Modal for Emailing Requestor */}
    {isModalOpen && currentRequest && (
      <div className="modal-overlay">
        <div className="modal-content">
          <h2>Process Request</h2>
          <h3>Requested Items:</h3>
          <ul>
            {(Array.isArray(currentRequest.itemName) ? currentRequest.itemName : currentRequest.itemName.split(',')).map(item => (
              <li key={item.trim()} onClick={() => handleItemClick(item.trim())} style={{ cursor: 'pointer', textDecoration: 'underline' }}>
                {item.trim()}
              </li>
            ))}
          </ul>

          <label>
            Action:
            <select onChange={(e) => handleActionChange(e.target.value)} value={selectedAction}>
              <option value="">Select Action</option>
              <option value="Purchased">Purchased</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>
          </label>

          {selectedAction && (
            <form onSubmit={handleEmailSubmit}>
              <label>
                Items (auto-filled from selection):
                <textarea
                  name="items"
                  value={selectedItems.join(', ')}
                  onChange={handleFormDataChange}
                  readOnly
                />
              </label>

              {selectedAction === "Purchased" && (
                <>
                  <label>
                    Date of Purchase:
                    <input type="date" name="purchaseDate" value={formData.purchaseDate} onChange={handleFormDataChange} required />
                  </label>
                  <label>
                    Requestor Email:
                    <input
                      type="email"
                      name="requestorEmail"
                      value={formData.requestorEmail}
                      onChange={handleFormDataChange}
                      required
                    />
                  </label>
                  <label>
                    Requestor's Phone:
                    <input type="tel" name="requestorPhone" value={formData.requestorPhone} onChange={handleFormDataChange} required />
                  </label>
                </>
              )}

              {selectedAction === "Out of Stock" && (
                <>
                  <label>
                    Requestor Email:
                    <input type="email" name="requestorEmail" value={formData.requestorEmail} onChange={handleFormDataChange} required />
                  </label>
                  <label>
                    Requestor Phone:
                    <input type="tel" name="requestorPhone" value={formData.requestorPhone} onChange={handleFormDataChange} required />
                  </label>
                </>
              )}
              <button type="submit">Submit</button>
              <button type="button" onClick={closeModal}>Cancel</button>
            </form>
          )}
        </div>
      </div>
    )}
  </div>
);

};

export default ApproveRequest;