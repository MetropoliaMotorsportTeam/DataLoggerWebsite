import React, { useState } from 'react';
import { uploadFirmware } from '../../hooks/firmwareApiHook';

function Firmware() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [configFile, setConfigFile] = useState(null); // New state for config file
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [deviceId, setDeviceId] = useState('');
  
  // Handle firmware file selection
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
    setUploadStatus(null);
    setUploadProgress(0);
    console.log("SELECTED FILE: ", file);
  };
  
  // Handle config file selection
  const handleConfigFileChange = (event) => {
    const file = event.target.files[0];
    setConfigFile(file);
    console.log("SELECTED CONFIG FILE: ", file);
  };

  // Upload to AWS backend
  const handleUpload = async () => {
    if (!selectedFile || !deviceId) {
      setUploadStatus('error');
      return;
    }
    
    setUploading(true);
    setUploadProgress(0);
    setUploadStatus('uploading');
    
    const response = await uploadFirmware(selectedFile, deviceId, configFile); // Pass config file if available
    console.log("Upload response:", response);

    if (response && response.success) {
      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 95) {
            clearInterval(interval);
            return 95;
          }
          return prev + 5;
        });
      }, 300);

      // Simulate upload completion after 3 seconds
      setTimeout(() => {
        clearInterval(interval);
        setUploadProgress(100);
        setUploading(false);
        setUploadStatus('success');
      }, 3000);
    } else {
      setUploading(false);
      setUploadStatus('error');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Firmware Management</h1>
        <p className="text-gray-600">
          Upload and manage firmware for your data logger and ECU systems.
          Firmware updates are synced to your devices via secure AWS connection.
        </p>
      </div>
      
      {/* Upload Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Upload Firmware</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* File Selector - first column */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Firmware File (Required)
            </label>
            <div className={`border-2 border-dashed rounded-lg p-4 text-center relative ${
              selectedFile ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
            }`}>
              {selectedFile ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"></path>
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-blue-700">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <button 
                    className="text-xs text-red-600 hover:text-red-800"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-700">
                    Click to select firmware
                  </p>
                  <p className="text-xs text-gray-500">
                    .bin, .hex, .fw
                  </p>
                </div>
              )}
              <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileChange}
                accept=".bin,.hex,.fw"
              />
            </div>
          </div>

          {/* Config File Selector - second column */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Config File (Optional)
            </label>
            <div className={`border-2 border-dashed rounded-lg p-4 text-center relative ${
              configFile ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-gray-400'
            }`}>
              {configFile ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-green-700">{configFile.name}</p>
                  <p className="text-xs text-gray-500">
                    {(configFile.size / 1024).toFixed(2)} KB
                  </p>
                  <button 
                    className="text-xs text-red-600 hover:text-red-800"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfigFile(null);
                    }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-gray-700">
                    Click to select config file
                  </p>
                  <p className="text-xs text-gray-500">
                    .dbc, .json, .yaml
                  </p>
                </div>
              )}
              <input
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleConfigFileChange}
                accept=".dbc,.json,.yaml,.yml,.xml"
              />
            </div>
          </div>
          
          {/* Form inputs - third column */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Device ID
            </label>
            <input 
              type="text" 
              className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
              placeholder="Enter CanEdge3 device ID"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              required
            />
            
            <div className="mt-4">
              <button
                onClick={handleUpload}
                disabled={!selectedFile || !deviceId || uploading}
                className={`w-full py-2 px-4 rounded-md font-medium ${
                  !selectedFile || !deviceId || uploading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {uploading ? 'Uploading...' : 'Upload Firmware'}
              </button>
              <p className="text-xs text-gray-500 mt-1">
                Config file is optional and will be applied during firmware update.
              </p>
            </div>
          </div>
        </div>

        {/* Upload status indicators */}
        {uploadStatus === 'uploading' && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {uploadStatus === 'success' && (
          <div className="mt-4 p-3 bg-green-50 text-green-800 rounded-md flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {configFile ? 
              'Firmware and configuration uploaded successfully!' : 
              'Firmware uploaded successfully! Ready to deploy.'}
          </div>
        )}

        {uploadStatus === 'error' && (
          <div className="mt-4 p-3 bg-red-50 text-red-800 rounded-md flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            Upload failed. Please try again.
          </div>
        )}
      </div>
    </div>
  );
}

export default Firmware;