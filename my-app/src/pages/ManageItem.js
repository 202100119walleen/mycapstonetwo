import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase-config';
import { storage } from '../firebase/firebase-config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import './ManageItem.css';
import JsBarcode from 'jsbarcode';

const ManageItem = () => {
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateDelivered, setDateDelivered] = useState({}); 
  const [itemQuantities, setItemQuantities] = useState({});   
  const [requestedQuantities, setRequestedQuantities] = useState({});
  const [imageFiles, setImageFiles] = useState({}); 
  const [editMode, setEditMode] = useState({});
  const [visibleSections, setVisibleSections] = useState({});

  useEffect(() => {
    const requestCollection = collection(db, 'requests');
    const unsubscribe = onSnapshot(requestCollection, (snapshot) => {
      const fetchedItems = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setItems(fetchedItems);
    });
    return () => unsubscribe();
  }, []);

  const flattenedItems = items.flatMap((request) =>
    request.itemName.map((item, index) => ({
      uniqueId: `${request.uniqueId}-${index + 1}`,  // Append batch number to the uniqueId
      itemName: item.name,
      purchasedQuantity: item.purchasedQuantity || 0,
      requestedQuantity: item.quantity || 0,
      supplierName: request.supplierName,
      category: request.category,
      college: request.college || 'N/A',
      department: request.department || 'N/A',
      program: request.program || 'N/A',
      requestDate: new Date(request.requestDate).toLocaleDateString(),
      requestPurpose: request.requestPurpose || 'N/A',
      specificType: request.specificType || 'N/A',
      requestId: request.id,
      dateDelivered: request.dateDelivered || '',
      image: request.image || null,
      isApproved: request.approved || false,
    }))
  );
  
  const downloadBarcode = (uniqueId, itemName) => {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, uniqueId, {
      format: 'CODE128',
      displayValue: true,
      text: itemName,
    });

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = `${uniqueId}-${itemName}-barcode.png`;
    link.click();
  };

  const groupedItems = flattenedItems.reduce((acc, item) => {
    const collegeKey = item.college;
    if (!acc[collegeKey]) {
      acc[collegeKey] = [];
    }
    acc[collegeKey].push(item);
    return acc;
  }, {});

  const handleDelete = async (id) => {
    const requestToDelete = flattenedItems.find(item => item.requestId === id);
    
    if (requestToDelete && requestToDelete.isApproved) {
      alert("This item cannot be deleted because it is approved.");
      return;
    }
  
    const requestRef = doc(db, 'requests', id);
    
    if (window.confirm("Are you sure you want to delete this item?")) {
      await deleteDoc(requestRef);
    }
  };  

  const handleDateChange = (uniqueId, date) => {
    setDateDelivered((prev) => ({ ...prev, [uniqueId]: date }));
  };

  const handleQuantityChange = (uniqueId, quantity) => {
    setItemQuantities((prev) => ({ ...prev, [uniqueId]: quantity }));
  };

  const handleRequestedQuantityChange = (uniqueId, quantity) => {
    setRequestedQuantities((prev) => ({ ...prev, [uniqueId]: quantity }));
  };

  const handleImageChange = (uniqueId, file) => {
    setImageFiles((prev) => ({ ...prev, [uniqueId]: file }));
  };

  const handleEditToggle = (uniqueId) => {
    setEditMode((prev) => ({
      ...prev,
      [uniqueId]: !prev[uniqueId], // Toggle only the specific uniqueId's edit mode
    }));
  };

  const handleUpdate = async (id) => {
    const requestRef = doc(db, 'requests', id);
    let imageUrl = null;
  
    if (imageFiles[id]) {
      try {
        const storageRef = ref(storage, `images/${imageFiles[id].name}`);
        await uploadBytes(storageRef, imageFiles[id]);
        imageUrl = await getDownloadURL(storageRef);
      } catch (error) {
        console.error("Error uploading image:", error);
        imageUrl = null; // Handle the error as needed
      }
    }
  
    await updateDoc(requestRef, {
      dateDelivered: dateDelivered[id] || null,
      purchasedQuantity: itemQuantities[id] || null,
      requestedQuantity: requestedQuantities[id] || null,
      image: imageUrl || null,
    });
  
    setDateDelivered((prev) => ({ ...prev, [id]: '' }));
    setItemQuantities((prev) => ({ ...prev, [id]: null }));
    setRequestedQuantities((prev) => ({ ...prev, [id]: null }));
    setImageFiles((prev) => ({ ...prev, [id]: null }));
    setEditMode((prev) => ({ ...prev, [id]: false }));
  };

  const filteredItems = flattenedItems.filter(item => 
    item.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.college.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.program.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleVisibility = (college) => {
    setVisibleSections((prev) => ({ ...prev, [college]: !prev[college] }));
  };

  const isUpdateButtonDisabled = (uniqueId) => {
    const dateFilled = dateDelivered[uniqueId];
    const quantityFilled = itemQuantities[uniqueId] && itemQuantities[uniqueId] > 0;
    const requestedQuantityFilled = requestedQuantities[uniqueId] && requestedQuantities[uniqueId] > 0;
    const imageFilled = imageFiles[uniqueId];

    return !(dateFilled && quantityFilled && requestedQuantityFilled && imageFilled);
  };

  return (
    <div className="manage-item">
      <h1>Manage Item</h1>
      <input
        type="text"
        placeholder="Search Colleges, Departments, Category, Item Name"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="search-barmanage"
      />
      {searchQuery && filteredItems.length > 0 ? (
        <div>
          <h2>Search Results:</h2>
          <table>
            <thead>
              <tr>
                <th>Unique ID</th>
                <th>Item Name</th>
                <th>Delivered Quantity</th>
                <th>Requested Quantity</th>
                <th>Supplier Name</th>
                <th>Category</th>
                <th>Department</th>
                <th>Program</th>
                <th>Request Date</th>
                <th>Request Purpose</th>
                <th>Specific Type</th>
                <th>Date Delivered</th>
                <th>Image Upload</th>
                <th>Image View</th>
                <th>Actions</th>
                <th>Download Barcode</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.uniqueId}>
                  <td>{item.uniqueId}</td>
                  <td>
                    <span
                      style={{ cursor: 'pointer', color: 'blue', textDecoration: 'underline' }}
                      onClick={() => downloadBarcode(item.uniqueId, item.itemName)}
                    >
                      {item.itemName}
                    </span>
                  </td>
                  <td>
                    <input
                      type="number"
                      value={itemQuantities[item.uniqueId] || item.purchasedQuantity}
                      onChange={(e) => handleQuantityChange(item.uniqueId, e.target.value)}
                      disabled={!editMode[item.uniqueId]}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={requestedQuantities[item.uniqueId] || item.requestedQuantity}
                      onChange={(e) => handleRequestedQuantityChange(item.uniqueId, e.target.value)}
                      disabled={!editMode[item.uniqueId]}
                    />
                  </td>
                  <td>{item.supplierName}</td>
                  <td>{item.category}</td>
                  <td>{item.department}</td>
                  <td>{item.program}</td>
                  <td>{item.requestDate}</td>
                  <td>{item.requestPurpose}</td>
                  <td>{item.specificType}</td>
                  <td>
                    <input
                      type="date"
                      value={dateDelivered[item.uniqueId] || item.dateDelivered}
                      onChange={(e) => handleDateChange(item.uniqueId, e.target.value)}
                      disabled={!editMode[item.uniqueId]}
                    />
                  </td>
                  <td>
                    <input
                      type="file"
                      onChange={(e) => handleImageChange(item.uniqueId, e.target.files[0])}
                      disabled={!editMode[item.uniqueId]}
                    />
                  </td>
                  <td>
                    {item.image ? (
                      <a href={item.image} target="_blank" rel="noopener noreferrer">
                        View Image
                      </a>
                    ) : (
                      'No Image'
                    )}
                  </td>
                  <td>
                    <button
                      onClick={() => handleEditToggle(item.uniqueId)}
                    >
                      {editMode[item.uniqueId] ? 'Cancel' : 'Edit'}
                    </button>
                    <button
                      onClick={() => handleUpdate(item.requestId)}
                      disabled={isUpdateButtonDisabled(item.uniqueId)}
                    >
                      Update
                    </button>
                    <button onClick={() => handleDelete(item.requestId)}>Delete</button>
                  </td>
                  <td>
                    <button onClick={() => downloadBarcode(item.uniqueId, item.itemName)}>Download Barcode</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        Object.keys(groupedItems).map((college) => (
          <div key={college}>
            <button onClick={() => toggleVisibility(college)}>
              {visibleSections[college] ? 'Hide' : 'Show'} {college} Items
            </button>
            {visibleSections[college] && (
              <div>
                <h2>{college}</h2>
                <table>
                  <thead>
                    <tr>
                      <th>Unique ID</th>
                      <th>Item Name</th>
                      <th>Delivered Quantity</th>
                      <th>Requested Quantity</th>
                      <th>Supplier Name</th>
                      <th>Category</th>
                      <th>Department</th>
                      <th>Program</th>
                      <th>Request Date</th>
                      <th>Request Purpose</th>
                      <th>Specific Type</th>
                      <th>Date Delivered</th>
                      <th>Image Upload</th>
                      <th>Image View</th>
                      <th>Actions</th>
                      <th>Download Barcode</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedItems[college].map((item) => (
                      <tr key={item.uniqueId}>
                        <td>{item.uniqueId}</td>
                        <td>{item.itemName}</td>
                        <td>
                          <input
                            type="number"
                            value={itemQuantities[item.uniqueId] || item.purchasedQuantity}
                            onChange={(e) => handleQuantityChange(item.uniqueId, e.target.value)}
                            disabled={!editMode[item.uniqueId]}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={requestedQuantities[item.uniqueId] || item.requestedQuantity}
                            onChange={(e) => handleRequestedQuantityChange(item.uniqueId, e.target.value)}
                            disabled={!editMode[item.uniqueId]}
                          />
                        </td>
                        <td>{item.supplierName}</td>
                        <td>{item.category}</td>
                        <td>{item.department}</td>
                        <td>{item.program}</td>
                        <td>{item.requestDate}</td>
                        <td>{item.requestPurpose}</td>
                        <td>{item.specificType}</td>
                        <td>
                          <input
                            type="date"
                            value={dateDelivered[item.uniqueId] || item.dateDelivered}
                            onChange={(e) => handleDateChange(item.uniqueId, e.target.value)}
                            disabled={!editMode[item.uniqueId]}
                          />
                        </td>
                        <td>
                          <input
                            type="file"
                            onChange={(e) => handleImageChange(item.uniqueId, e.target.files[0])}
                            disabled={!editMode[item.uniqueId]}
                          />
                        </td>
                        <td>
                          {item.image ? (
                            <a href={item.image} target="_blank" rel="noopener noreferrer">
                              View Image
                            </a>
                          ) : (
                            'No Image'
                          )}
                        </td>
                        <td>
                          <button
                            onClick={() => handleEditToggle(item.uniqueId)}
                          >
                            {editMode[item.uniqueId] ? 'Cancel' : 'Edit'}
                          </button>
                          <button
                            onClick={() => handleUpdate(item.requestId)}
                            disabled={isUpdateButtonDisabled(item.uniqueId)}
                          >
                            Update
                          </button>
                          <button onClick={() => handleDelete(item.requestId)}>Delete</button>
                        </td>
                        <td>
                          <button onClick={() => downloadBarcode(item.uniqueId, item.itemName)}>Download Barcode</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default ManageItem;
