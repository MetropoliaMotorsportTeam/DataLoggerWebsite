import React, { useState } from 'react';
import { uploadFirmware } from '../../hooks/firmwareApiHook';

function Firmware() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [configFile, setConfigFile] = useState(null);
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
  };
  
  // Handle config file selection
  const handleConfigFileChange = (event) => {
    const file = event.target.files[0];
    setConfigFile(file);
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
    
    const response = await uploadFirmware(selectedFile, deviceId, configFile);
    console.log("Upload response:", response);

    if (response && response.success) {
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 95) {
            clearInterval(interval);
            return 95;
          }
          return prev + 5;
        });
      }, 300);

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
    <div className="p-4 md:p-6 text-gray-200" style={{ fontFamily: "'Roboto Mono', monospace" }}>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Firmware Management</h1>
          <p className="text-gray-400">
            Upload and manage firmware for your data logger and ECU systems.
          </p>
        </div>
        
        {/* Upload Section */}
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6 shadow-2xl">
          <h2 className="text-xl font-semibold mb-6 text-gray-100">Upload New Build</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Firmware File Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Firmware File <span className="text-red-400">*</span>
              </label>
              <div className={`border-2 border-dashed rounded-lg p-4 text-center relative transition-colors ${
                selectedFile ? 'border-blue-500 bg-blue-900/20' : 'border-gray-600 hover:border-blue-500'
              }`}>
                {selectedFile ? (
                  <div className="space-y-1">
                    <svg className="w-8 h-8 mx-auto text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
                    <p className="text-sm font-medium text-blue-300 truncate">{selectedFile.name}</p>
                    <p className="text-xs text-gray-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    <button className="text-xs text-red-400 hover:text-red-300" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}>Remove</button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <svg className="w-8 h-8 mx-auto text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    <p className="text-sm font-medium text-gray-400">Click to select firmware</p>
                    <p className="text-xs text-gray-500">.bin, .hex, .fw</p>
                  </div>
                )}
                <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} accept=".bin,.hex,.fw" />
              </div>
            </div>

            {/* Config File Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Config File</label>
              <div className={`border-2 border-dashed rounded-lg p-4 text-center relative transition-colors ${
                configFile ? 'border-green-500 bg-green-900/20' : 'border-gray-600 hover:border-green-500'
              }`}>
                {configFile ? (
                  <div className="space-y-1">
                    <svg className="w-8 h-8 mx-auto text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>
                    <p className="text-sm font-medium text-green-300 truncate">{configFile.name}</p>
                    <p className="text-xs text-gray-400">{(configFile.size / 1024).toFixed(2)} KB</p>
                    <button className="text-xs text-red-400 hover:text-red-300" onClick={(e) => { e.stopPropagation(); setConfigFile(null); }}>Remove</button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <svg className="w-8 h-8 mx-auto text-gray-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>
                    <p className="text-sm font-medium text-gray-400">Click to select config</p>
                    <p className="text-xs text-gray-500">.dbc, .json, .yaml</p>
                  </div>
                )}
                <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleConfigFileChange} accept=".dbc,.json,.yaml,.yml,.xml" />
              </div>
            </div>
            
            {/* Form inputs */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Device ID <span className="text-red-400">*</span></label>
                <input type="text" className="w-full bg-gray-800 border border-gray-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="e.g., CE3X2-00000000" value={deviceId} onChange={(e) => setDeviceId(e.target.value)} required />
              </div>
              <div className="pt-2">
                <button onClick={handleUpload} disabled={!selectedFile || !deviceId || uploading} className={`w-full py-2.5 px-4 rounded-md font-medium transition-colors ${!selectedFile || !deviceId || uploading ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                  {uploading ? 'Uploading...' : 'Upload to Device'}
                </button>
              </div>
            </div>
          </div>

          {/* Upload status indicators */}
          {uploadStatus === 'uploading' && (
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-sm text-gray-300">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
              </div>
            </div>
          )}

          {uploadStatus === 'success' && (
            <div className="mt-6 p-3 bg-green-900/50 text-green-300 rounded-md flex items-center border border-green-700">
              <svg className="w-5 h-5 mr-3 flex-shrink-0 text-green-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              {configFile ? 'Firmware and configuration uploaded successfully!' : 'Firmware uploaded successfully!'}
            </div>
          )}

          {uploadStatus === 'error' && (
            <div className="mt-6 p-3 bg-red-900/50 text-red-300 rounded-md flex items-center border border-red-700">
              <svg className="w-5 h-5 mr-3 flex-shrink-0 text-red-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
              Upload failed. Please check the device ID and file, then try again.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Firmware;