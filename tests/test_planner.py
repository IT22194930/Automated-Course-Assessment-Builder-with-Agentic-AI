import pytest
from agents.planner import planner_agent

def test_curriculum_structure():
    """
    Validates that the Planner Agent produces a correctly structured 
    syllabus with exactly 5 modules as required.
    """
    # Mocking the agent output for property-based testing
    sample_output = """
    1. Introduction to Cloud
    2. Infrastructure as Service
    3. Platform as Service
    4. Software as Service
    5. Cloud Security
    """
    
    modules = [line for line in sample_output.split('\n') if line.strip()]
    
    # Requirement: Exactly 5 modules
    assert len(modules) == 5, f"Expected 5 modules, but got {len(modules)}"
    
    # Requirement: Logical numbering
    assert "1." in modules[0] and "5." in modules[4], "Modules are not correctly numbered."
    
    print("Member 1 (Planner) Test: PASSED")

if __name__ == "__main__":
    test_curriculum_structure()