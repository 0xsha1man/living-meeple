import { FC, useEffect, useState } from 'react';
import { deleteFile, getFiles } from './api';

interface FileMetadata {
  name: string;
  displayName: string;
  createTime: string;
  sizeBytes: string;
  mimeType: string;
  uri: string;
}

export const FilesApiView: FC = () => {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const fileList = await getFiles();
      setFiles(fileList);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleDelete = async (file: FileMetadata) => {
    const fileName = file.displayName || file.name;
    if (window.confirm(`Are you sure you want to delete the file "${fileName}"? This cannot be undone.`)) {
      try {
        await deleteFile(file.name);
        setFiles(prevFiles => prevFiles.filter(f => f.name !== file.name));
      } catch (err: any) {
        setError(`Failed to delete file: ${err.message}`);
      }
    }
  };

  if (loading) {
    return <div className="detail-card">Loading files from API...</div>;
  }

  if (error) {
    return <div className="detail-card error-card">Error loading files: {error}</div>;
  }

  return (
    <div className="files-api-container">
      <h2>Google AI Studio Files ({files.length})</h2>
      <p>This is a list of all files uploaded to the project via the Files API. You can manage them here to free up storage.</p>
      <button onClick={fetchFiles} disabled={loading} className="refresh-button">
        <i className="fas fa-sync-alt"></i> Refresh List
      </button>
      <div className="files-table-container">
        <table>
          <thead>
            <tr>
              <th>Display Name</th>
              <th>Size</th>
              <th>MIME Type</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {files.map(file => (
              <tr key={file.name}>
                <td title={file.name}>{file.displayName || '(No display name)'}</td>
                <td>{(parseInt(file.sizeBytes, 10) / 1024).toFixed(2)} KB</td>
                <td>{file.mimeType}</td>
                <td>{new Date(file.createTime).toLocaleString()}</td>
                <td><button className="delete-file-button" onClick={() => handleDelete(file)}>Delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};