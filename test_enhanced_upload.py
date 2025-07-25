import requests
import json
import os

# JWT token from login (you'll need to get a fresh token)
token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI1IiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiZXhwIjoxNzUyOTg4NTM4fQ.VtuKFrRy6LaqOgT8LeMJ-HE6p7z6lYNELs31869NHWg"

# Headers with authorization
headers = {
    "Authorization": f"Bearer {token}"
}

def test_supported_types():
    """Test the supported file types endpoint"""
    print("Testing supported file types endpoint...")
    response = requests.get("http://localhost:8000/upload/supported-types")
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Supported extensions: {len(data['supported_extensions'])}")
        print(f"Max file size: {data['max_file_size_mb']}MB")
        print("File type categories:")
        for category, extensions in data['file_types'].items():
            print(f"  {category}: {len(extensions)} types")
    else:
        print(f"Error: {response.text}")

def test_upload_file(filename, content_type=None):
    """Test uploading a specific file"""
    print(f"\nTesting upload of {filename}...")
    
    if not os.path.exists(filename):
        print(f"File {filename} not found!")
        return
    
    try:
        with open(filename, "rb") as f:
            files = {"file": (filename, f, content_type or "text/plain")}
            response = requests.post("http://localhost:8000/upload", headers=headers, files=files)
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"File info: {data.get('file_info', {})}")
        
    except Exception as e:
        print(f"Error uploading {filename}: {e}")

def create_test_files():
    """Create various test files to demonstrate different formats"""
    test_files = {
        "test.txt": "This is a simple text file for testing the upload API.",
        "test.md": "# Test Markdown\n\nThis is a **markdown** file with *formatting*.",
        "test.json": json.dumps({"name": "test", "value": 123, "items": ["a", "b", "c"]}, indent=2),
        "test.csv": "name,age,city\nJohn,25,New York\nJane,30,Los Angeles\nBob,35,Chicago",
        "test.yaml": "name: test\ndescription: A test YAML file\nversion: 1.0\nfeatures:\n  - feature1\n  - feature2",
        "test.py": "# Test Python file\ndef hello_world():\n    print('Hello, World!')\n\nif __name__ == '__main__':\n    hello_world()",
        "test.html": "<html><head><title>Test</title></head><body><h1>Test HTML</h1><p>This is a test HTML file.</p></body></html>"
    }
    
    for filename, content in test_files.items():
        with open(filename, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Created test file: {filename}")

def main():
    print("Enhanced Upload API Test")
    print("=" * 50)
    
    # Test supported types endpoint
    test_supported_types()
    
    # Create test files
    print("\nCreating test files...")
    create_test_files()
    
    # Test uploads with different file types
    test_files = [
        ("test.txt", "text/plain"),
        ("test.md", "text/markdown"),
        ("test.json", "application/json"),
        ("test.csv", "text/csv"),
        ("test.yaml", "application/x-yaml"),
        ("test.py", "text/x-python"),
        ("test.html", "text/html")
    ]
    
    for filename, content_type in test_files:
        test_upload_file(filename, content_type)
    
    # Test error cases
    print("\nTesting error cases...")
    
    # Test with invalid token
    print("\nTesting with invalid token...")
    invalid_headers = {"Authorization": "Bearer invalid_token"}
    with open("test.txt", "rb") as f:
        files = {"file": ("test.txt", f, "text/plain")}
        response = requests.post("http://localhost:8000/upload", headers=invalid_headers, files=files)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    # Test with unsupported file type
    print("\nTesting with unsupported file type...")
    with open("test.txt", "rb") as f:
        files = {"file": ("test.xyz", f, "application/unknown")}
        response = requests.post("http://localhost:8000/upload", headers=headers, files=files)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")

if __name__ == "__main__":
    main() 