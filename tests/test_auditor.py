import os

# Path where the real pipeline writes its outputs
OUTPUT_DIR = "./data/cloud_computing_fundamentals"

def test_final_report_exists():
    """
    Validates that the Auditor Agent (via output_file) persisted the
    final compiled course report to the local filesystem.
    Requirement: File must exist and contain content (Zero-Cost / Local Constraint).
    """
    report_path = os.path.join(OUTPUT_DIR, "final_report.md")
    assert os.path.exists(report_path), (
        f"final_report.md not found at '{report_path}'. "
        "Run 'python main.py' first to generate the pipeline outputs."
    )
    assert os.path.getsize(report_path) > 0, "final_report.md exists but is empty."
    print("Member 4 (Auditor) Test: PASSED — final_report.md present and non-empty.")


def test_intermediate_files_exist():
    """
    Validates that intermediate pipeline artefacts (syllabus, lessons, quiz)
    were all persisted locally — proving each agent completed its task.
    """
    expected_files = ["syllabus.md", "lessons.md", "quiz.md", "final_report.md"]
    for filename in expected_files:
        path = os.path.join(OUTPUT_DIR, filename)
        assert os.path.exists(path), (
            f"'{filename}' not found in '{OUTPUT_DIR}'. "
            "Run 'python main.py' first."
        )
        assert os.path.getsize(path) > 0, f"'{filename}' exists but is empty."
    print("Member 4 (Auditor) Test: PASSED — all pipeline artefacts present.")


if __name__ == "__main__":
    test_final_report_exists()
    test_intermediate_files_exist()