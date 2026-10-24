import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SearchableEmployeeCombobox } from "../searchable-employee-combobox";
import { EmployeeOut } from "@/types";

const mockEmployees: EmployeeOut[] = [
  {
    id: "emp-1",
    first_name: "Rahim",
    last_name: "Chowdhury",
    full_name: "Rahim Chowdhury",
    employee_id: "EMP-001",
    work_email: "rahim@example.com",
    job_title_name: "Operations Director",
    department_name: "Executive Management",
  } as EmployeeOut,
  {
    id: "emp-2",
    first_name: "Fatima",
    last_name: "Begum",
    full_name: "Fatima Begum",
    employee_id: "EMP-002",
    work_email: "fatima@example.com",
    job_title_name: "Branch Lead",
    department_name: "Retail Operations",
  } as EmployeeOut,
  {
    id: "emp-3",
    first_name: "Tanvir",
    last_name: "Hasan",
    full_name: "Tanvir Hasan",
    employee_id: "EMP-003",
    work_email: "tanvir@example.com",
    job_title_name: "Inventory Specialist",
    department_name: "Supply Chain",
  } as EmployeeOut,
];

describe("SearchableEmployeeCombobox Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders placeholder when no employee is selected", () => {
    render(
      <SearchableEmployeeCombobox
        employees={mockEmployees}
        value=""
        onChange={vi.fn()}
        placeholder="Select Branch Manager / Lead..."
      />
    );

    expect(screen.getByText("Select Branch Manager / Lead...")).toBeInTheDocument();
  });

  it("renders selected employee name, badge, and title", () => {
    render(
      <SearchableEmployeeCombobox
        employees={mockEmployees}
        value="emp-2"
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText("Fatima Begum")).toBeInTheDocument();
    expect(screen.getByText("EMP-002")).toBeInTheDocument();
    expect(screen.getByText(/Branch Lead/)).toBeInTheDocument();
  });

  it("opens popover on click and lists all employees plus unassigned option", async () => {
    render(
      <SearchableEmployeeCombobox
        employees={mockEmployees}
        value=""
        onChange={vi.fn()}
      />
    );

    const trigger = screen.getByRole("button");
    fireEvent.click(trigger);

    expect(screen.getByPlaceholderText("Search by name, ID, title, or email...")).toBeInTheDocument();
    expect(screen.getByText("-- No Branch Manager Assigned --")).toBeInTheDocument();
    expect(screen.getByText("Rahim Chowdhury")).toBeInTheDocument();
    expect(screen.getByText("Fatima Begum")).toBeInTheDocument();
    expect(screen.getByText("Tanvir Hasan")).toBeInTheDocument();
  });

  it("filters employees instantly by name", () => {
    render(
      <SearchableEmployeeCombobox
        employees={mockEmployees}
        value=""
        onChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button"));

    const searchInput = screen.getByPlaceholderText("Search by name, ID, title, or email...");
    fireEvent.change(searchInput, { target: { value: "Rahim" } });

    expect(screen.getByText("Rahim Chowdhury")).toBeInTheDocument();
    expect(screen.queryByText("Fatima Begum")).not.toBeInTheDocument();
    expect(screen.queryByText("Tanvir Hasan")).not.toBeInTheDocument();
  });

  it("filters employees instantly by employee ID code", () => {
    render(
      <SearchableEmployeeCombobox
        employees={mockEmployees}
        value=""
        onChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button"));

    const searchInput = screen.getByPlaceholderText("Search by name, ID, title, or email...");
    fireEvent.change(searchInput, { target: { value: "003" } });

    expect(screen.getByText("Tanvir Hasan")).toBeInTheDocument();
    expect(screen.queryByText("Rahim Chowdhury")).not.toBeInTheDocument();
  });

  it("filters employees instantly by job title", () => {
    render(
      <SearchableEmployeeCombobox
        employees={mockEmployees}
        value=""
        onChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button"));

    const searchInput = screen.getByPlaceholderText("Search by name, ID, title, or email...");
    fireEvent.change(searchInput, { target: { value: "Specialist" } });

    expect(screen.getByText("Tanvir Hasan")).toBeInTheDocument();
    expect(screen.queryByText("Rahim Chowdhury")).not.toBeInTheDocument();
  });

  it("displays empty state when no match is found", () => {
    render(
      <SearchableEmployeeCombobox
        employees={mockEmployees}
        value=""
        onChange={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button"));

    const searchInput = screen.getByPlaceholderText("Search by name, ID, title, or email...");
    fireEvent.change(searchInput, { target: { value: "NonExistent" } });

    expect(screen.getByText(/No employees found matching/)).toBeInTheDocument();
  });

  it("calls onChange with employee id when clicked and closes dropdown", () => {
    const handleChange = vi.fn();
    render(
      <SearchableEmployeeCombobox
        employees={mockEmployees}
        value=""
        onChange={handleChange}
      />
    );

    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByText("Fatima Begum"));

    expect(handleChange).toHaveBeenCalledWith("emp-2");
    // Popover closes
    expect(screen.queryByPlaceholderText("Search by name, ID, title, or email...")).not.toBeInTheDocument();
  });

  it("clears selection when unassign button is clicked", () => {
    const handleChange = vi.fn();
    render(
      <SearchableEmployeeCombobox
        employees={mockEmployees}
        value="emp-1"
        onChange={handleChange}
      />
    );

    // Click quick clear button (X)
    const clearBtn = screen.getByTitle("Clear selection");
    fireEvent.click(clearBtn);

    expect(handleChange).toHaveBeenCalledWith("");
  });
});
