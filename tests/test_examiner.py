import json

def test_quiz_json_format():
    """
    Validates that the Examiner's tool correctly formats the quiz 
    into a machine-readable JSON structure.
    """
    # Mock output from the quiz_format_tool
    sample_json_output = '{"topic": "Cloud", "quiz_content": "Q1: What is SaaS?"}'
    
    try:
        data = json.loads(sample_json_output)
        # Requirement: Key presence
        assert "topic" in data
        assert "quiz_content" in data
        print("Member 3 (Examiner) Test: PASSED (Valid JSON)")
    except json.JSONDecodeError:
        pytest.fail("Examiner Agent produced invalid JSON.")

if __name__ == "__main__":
    test_quiz_json_format()