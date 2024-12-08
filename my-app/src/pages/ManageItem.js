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
  const [editModeId, setEditModeId] = useState(null);
  const [currentlyEditingUniqueId, setCurrentlyEditingUniqueId] = useState(null);
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
    request.itemName.map((item) => ({
      uniqueId: request.uniqueId,
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

  const handleDateChange = (id, date) => {
    setDateDelivered((prev) => ({ ...prev, [id]: date }));
  };

  const handleQuantityChange = (id, quantity) => {
    setItemQuantities((prev) => ({ ...prev, [id]: quantity }));
  };

  const handleRequestedQuantityChange = (id, quantity) => {
    setRequestedQuantities((prev) => ({ ...prev, [id]: quantity }));
  };

  const handleImageChange = (id, file) => {
    setImageFiles((prev) => ({ ...prev, [id ]: file }));
  };
  const handleEditToggle = (item) => {
    if (editModeId && currentlyEditingUniqueId === item.uniqueId) {
      // If the same item is clicked again, exit edit mode
      setEditModeId(null);
      setCurrentlyEditingUniqueId(null);
    } else if (editModeId) {
      // If another item is being edited, alert the user
      alert("You can only edit one item at a time.");
    } else {
      // Set the item to edit mode
      setEditModeId(item.requestId);
      setCurrentlyEditingUniqueId(item.uniqueId);
    }
  };

  const handleUpdate = async (id) => {
    const itemToUpdate = flattenedItems.find(item => item.requestId === id);
    
    if (itemToUpdate && itemToUpdate.uniqueId === currentlyEditingUniqueId) {
      const updatedData = {
        dateDelivered: dateDelivered[id] || '',
        purchasedQuantity: itemQuantities[id] || 0,
        requestedQuantity: requestedQuantities[id] || 0,
        image: imageFiles[id] ? await uploadImage(id) : null,
      };
  
      const requestRef = doc(db, 'requests', id);
      await updateDoc(requestRef, updatedData);
      setEditModeId(null);
      setCurrentlyEditingUniqueId(null);
    } else {
      alert("You cannot update this item because it is not the one currently being edited.");
    }
  };

  const uploadImage = async (id) => {
    const file = imageFiles[id];
    const storageRef = ref(storage, `images/${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const toggleVisibility = (college) => {
    setVisibleSections((prev) => ({
      ...prev,
      [college]: !prev[college],
    }));
  };

  return (
    <div className="manage-item">
      <h1>Manage Items</h1>
      <input
        type="text"
        placeholder="Search..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      {searchQuery === '' && Object.keys(groupedItems).length > 0 ? (
        <div>
          {Object.keys(groupedItems).map((college) => (
            <div key={college}>
              <h2 onClick={() => toggleVisibility(college)} style={{ cursor: 'pointer' }}>
                {college} Items {visibleSections[college] ? '▼' : '▲'}
              </h2>
              {visibleSections[college] && (
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
                            value={itemQuantities[item.requestId] || item.purchasedQuantity}
                            onChange={(e) => handleQuantityChange(item.requestId, e.target.value)}
                            disabled={editModeId !== item.requestId}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            value={requestedQuantities[item.requestId] || item.requestedQuantity}
                            onChange={(e) => handleRequestedQuantityChange(item.requestId, e.target.value)}
                            disabled={editModeId !== item.requestId}
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
                            value={dateDelivered[item.requestId] || item.dateDelivered}
                            onChange={(e) => handleDateChange(item.requestId, e.target.value)}
                            disabled={editModeId !== item.requestId}
                          />
                        </td>
                        <td>
  <input
    type="file"
    onChange={(e) => handleImageChange(item.requestId, e.target.files[0])}
    disabled={editModeId !== item.requestId}
  />
</td>
                          <td>
                            {item.image ? (
                              <a href={item.image} target="_blank" rel="noopener noreferrer">
                                View Image
                              </a>
                            ) : (
                              <span>No Image</span>
                            )}
                          </td>
                          <td>
                            {editModeId === item.requestId ? (
                              <button onClick={() => handleUpdate(item.requestId)}>Save</button>
                            ) : (
                              <button onClick={() => handleEditToggle(item)}>Edit</button>
                            )}
                            <button onClick={() => handleDelete(item.requestId)} disabled={item.isApproved}>
                              Delete
                            </button>
                          </td>
                          <td>
                            <button onClick={() => downloadBarcode(item.uniqueId, item.itemName)}>Download Barcode</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        ) : (
          searchQuery && <p>No items match your search criteria.</p>
        )}
      </div>
    );
  };
  
  export default ManageItem;