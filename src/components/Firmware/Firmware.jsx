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
    <div className="p-4 md:p-6" style={{ fontFamily: "'Roboto Mono', monospace", color: 'var(--text-primary)' }}>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Firmware Management</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Upload and manage firmware for your data logger and ECU systems.
          </p>
        </div>
        
        {/* Upload Section */}
        <div className="rounded-lg p-6 shadow-2xl" style={{ backgroundColor: 'var(--surface-layer)', border: '1px solid var(--primary-accent)' }}>
          <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>Upload New Build</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Firmware File Selector */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
                Firmware File <span style={{ color: 'var(--warning-attention)' }}>*</span>
              </label>
              <div className={`border-2 border-dashed rounded-lg p-4 text-center relative transition-colors`}
                style={{
                  borderColor: selectedFile ? 'var(--accent-highlight)' : 'var(--text-secondary)',
                  backgroundColor: selectedFile ? 'rgba(0, 255, 255, 0.1)' : 'transparent'
                }}
              >
                {selectedFile ? (
                  <div className="space-y-1">
                    <svg className="w-8 h-8 mx-auto" style={{ color: 'var(--accent-highlight)' }} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--accent-highlight)' }}>{selectedFile.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    <button className="text-xs" style={{ color: 'var(--warning-attention)' }} onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}>Remove</button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <svg className="w-8 h-8 mx-auto" style={{ color: 'var(--text-secondary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Click to select firmware</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>.bin, .hex, .fw</p>
                  </div>
                )}
                <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} accept=".bin,.hex,.fw" />
              </div>
            </div>

            {/* Config File Selector */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Config File</label>
              <div className={`border-2 border-dashed rounded-lg p-4 text-center relative transition-colors`}
                style={{
                  borderColor: configFile ? 'var(--success-positive)' : 'var(--text-secondary)',
                  backgroundColor: configFile ? 'rgba(128, 255, 128, 0.1)' : 'transparent'
                }}
              >
                {configFile ? (
                  <div className="space-y-1">
                    <svg className="w-8 h-8 mx-auto" style={{ color: 'var(--success-positive)' }} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--success-positive)' }}>{configFile.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{(configFile.size / 1024).toFixed(2)} KB</p>
                    <button className="text-xs" style={{ color: 'var(--warning-attention)' }} onClick={(e) => { e.stopPropagation(); setConfigFile(null); }}>Remove</button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <svg className="w-8 h-8 mx-auto" style={{ color: 'var(--text-secondary)' }} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" /></svg>
                    <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Click to select config</p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>.dbc, .json, .yaml</p>
                  </div>
                )}
                <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleConfigFileChange} accept=".dbc,.json,.yaml,.yml,.xml" />
              </div>
            </div>
            
            {/* Form inputs */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Device ID <span style={{ color: 'var(--warning-attention)' }}>*</span></label>
                <input type="text" className="w-full rounded-md py-2 px-3 focus:outline-none focus:ring-2" style={{ backgroundColor: 'var(--background-base)', border: '1px solid var(--primary-accent)', color: 'var(--text-primary)' }} placeholder="e.g., CE3X2-00000000" value={deviceId} onChange={(e) => setDeviceId(e.target.value)} required />
              </div>
              <div className="pt-2">
                <button onClick={handleUpload} disabled={!selectedFile || !deviceId || uploading} className={`w-full py-2.5 px-4 rounded-md font-medium transition-colors ${!selectedFile || !deviceId || uploading ? 'cursor-not-allowed' : ''}`}
                  style={{
                    backgroundColor: !selectedFile || !deviceId || uploading ? 'var(--surface-layer)' : 'var(--primary-accent)',
                    color: !selectedFile || !deviceId || uploading ? 'var(--text-secondary)' : 'var(--background-base)',
                    border: `1px solid ${!selectedFile || !deviceId || uploading ? 'var(--text-secondary)' : 'var(--primary-accent)'}`
                  }}
                >
                  {uploading ? 'Uploading...' : 'Upload to Device'}
                </button>
              </div>
            </div>
          </div>

          {/* Upload status indicators */}
          {uploadStatus === 'uploading' && (
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-sm" style={{ color: 'var(--text-secondary)' }}>
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full rounded-full h-2" style={{ backgroundColor: 'var(--background-base)' }}>
                <div className="h-2 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%`, backgroundColor: 'var(--primary-accent)' }}></div>
              </div>
            </div>
          )}

          {uploadStatus === 'success' && (
            <div className="mt-6 p-3 rounded-md flex items-center" style={{ backgroundColor: 'rgba(128, 255, 128, 0.1)', border: '1px solid var(--success-positive)', color: 'var(--success-positive)' }}>
              <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              {configFile ? 'Firmware and configuration uploaded successfully!' : 'Firmware uploaded successfully!'}
            </div>
          )}

          {uploadStatus === 'error' && (
            <div className="mt-6 p-3 rounded-md flex items-center" style={{ backgroundColor: 'rgba(255, 193, 7, 0.1)', border: '1px solid var(--warning-attention)', color: 'var(--warning-attention)' }}>
              <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
              Upload failed. Please check the device ID and file, then try again.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Firmware;