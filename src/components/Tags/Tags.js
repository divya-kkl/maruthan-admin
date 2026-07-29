import React, { useState, useEffect, useCallback } from 'react';
import { GraphQLClient, gql } from 'graphql-request';
import { FaEdit, FaTrash, FaPlus, FaSearch } from 'react-icons/fa';
import './Tags.css';

const GRAPHQL_ENDPOINT = process.env.REACT_APP_GRAPHQL_ENDPOINT || "http://localhost:2000/graphql";
const client = new GraphQLClient(GRAPHQL_ENDPOINT, {
  headers: {
    authorization: `Bearer ${localStorage.getItem('jwtToken')}`
  }
});

const GET_ALL_TAGS = gql`
  query GetAllTags($search: String, $page: Int, $limit: Int) {
    getAllTags(search: $search, page: $page, limit: $limit) {
      tags {
        id
        name
        code
        description
        status
        createdTime
      }
      totalCount
    }
  }
`;

const CREATE_TAG = gql`
  mutation CreateTag($input: CreateTagInput!) {
    createTag(input: $input) {
      id
      name
      code
    }
  }
`;

const UPDATE_TAG = gql`
  mutation UpdateTag($id: ID!, $input: UpdateTagInput!) {
    updateTag(id: $id, input: $input) {
      id
      name
      code
    }
  }
`;

const DELETE_TAG = gql`
  mutation DeleteTag($id: ID!) {
    deleteTag(id: $id)
  }
`;

function Tags() {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const limit = 10;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTag, setCurrentTag] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    status: 'ACTIVE'
  });

  const [toastMessage, setToastMessage] = useState(null);
  const [toastType, setToastType] = useState('success');

  const showToast = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchTags = useCallback(async () => {
    try {
      setLoading(true);
      const data = await client.request(GET_ALL_TAGS, { search: searchTerm, page, limit });
      setTags(data.getAllTags?.tags || []);
      setTotalCount(data.getAllTags?.totalCount || 0);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, page, limit]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTags();
    }, 500);
    return () => clearTimeout(timer);
  }, [fetchTags]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const input = {
        name: formData.name,
        code: formData.code,
        description: formData.description,
        status: formData.status
      };

      if (currentTag) {
        await client.request(UPDATE_TAG, {
          id: currentTag.id,
          input
        });
        showToast('Tag updated successfully!');
      } else {
        await client.request(CREATE_TAG, { input });
        showToast('Tag created successfully!');
      }
      
      setIsModalOpen(false);
      resetForm();
      fetchTags();
    } catch (err) {
      const msg = err.response?.errors?.[0]?.message || err.message;
      showToast('Error saving tag: ' + msg, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this tag?')) {
      try {
        await client.request(DELETE_TAG, { id });
        showToast('Tag deleted successfully!');
        fetchTags();
      } catch (err) {
        const msg = err.response?.errors?.[0]?.message || err.message;
        showToast('Error deleting tag: ' + msg, 'error');
      }
    }
  };

  const openEditModal = (tag) => {
    setCurrentTag(tag);
    setFormData({
      name: tag.name,
      code: tag.code,
      description: tag.description || '',
      status: tag.status
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setCurrentTag(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      status: 'ACTIVE'
    });
  };

  const totalPages = Math.ceil(totalCount / limit);

  return (
    <div className="tags-container">
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: toastType === 'error' ? '#f44336' : '#4caf50',
          color: 'white',
          padding: '16px',
          borderRadius: '4px',
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
          zIndex: 10000,
          fontWeight: '500',
          transition: 'opacity 0.3s',
        }}>
          {toastMessage}
        </div>
      )}

      <div className="tags-header">
        <h2>Manage Tags</h2>
        <button 
          className="add-btn"
          onClick={() => {
            resetForm();
            setIsModalOpen(true);
          }}
        >
          <FaPlus /> Add New Tag
        </button>
      </div>

      <div className="tags-controls">
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search tags by name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading && <div className="loading">Loading tags...</div>}
      {error && <div className="error">{error.message}</div>}

      {!loading && !error && (
        <>
          <div className="table-responsive">
            <table className="tags-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Created Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tags.length > 0 ? (
                  tags.map((tag) => (
                    <tr key={tag.id}>
                      <td>{tag.name}</td>
                      <td>{tag.code}</td>
                      <td>{tag.description || '-'}</td>
                      <td>
                        <span className={`status-badge ${tag.status?.toLowerCase()}`}>
                          {tag.status}
                        </span>
                      </td>
                      <td>{new Date(Number(tag.createdTime)).toLocaleDateString()}</td>
                      <td className="actions-cell">
                        <button className="action-btn edit" onClick={() => openEditModal(tag)} title="Edit">
                          <FaEdit />
                        </button>
                        <button className="action-btn delete" onClick={() => handleDelete(tag.id)} title="Delete">
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="no-data">No tags found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button 
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </button>
              <span className="page-info">
                Page {page} of {totalPages}
              </span>
              <button 
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{currentTag ? 'Edit Tag' : 'Add New Tag'}</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., Summer Sale"
                />
              </div>
              <div className="form-group">
                <label>Code *</label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g., SUMMERSALE"
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Tag description..."
                  rows="3"
                ></textarea>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
              
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  {currentTag ? 'Update Tag' : 'Create Tag'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Tags;
