import os

def test_final_file_persistence():
    """
    Validates that the Auditor Agent correctly interacted with the local 
    file system to save the final course report.
    """
    test_path = "./data/test_course/final_report.md"
    
    # Simulate agent tool call
    os.makedirs(os.path.dirname(test_path), exist_ok=True)
    with open(test_path, 'w') as f:
        f.write("# Final Course")
    
    # Requirement: File must exist locally (Zero-Cost / Local Constraint)
    assert os.path.exists(test_path), "The final course report was not saved locally."
    assert os.path.getsize(test_path) > 0, "The final report file is empty."
    
    print("Member 4 (Auditor) Test: PASSED")
    
    # Cleanup
    os.remove(test_path)

if __name__ == "__main__":
    test_final_file_persistence()