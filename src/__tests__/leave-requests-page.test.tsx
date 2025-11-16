/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LeaveRequestsPage from "@/app/leave/requests/page";
import { useLeaveRequests, useCancelLeaveRequest } from "@/hooks/useLeaveRequests";
import { useSession } from "next-auth/react";

jest.mock("@/components/ui/button", () => {
  const React = require("react");
  return {
    Button: ({ children, ...props }: any) => (
      <button type="button" {...props}>
        {children}
      </button>
    ),
  };
});

jest.mock("@/components/ui/card", () => {
  const React = require("react");
  const createComponent = () => ({ children, ...props }: any) => (
    <div {...props}>{children}</div>
  );
  return {
    Card: createComponent(),
    CardContent: createComponent(),
    CardDescription: createComponent(),
    CardHeader: createComponent(),
    CardTitle: createComponent(),
  };
});

jest.mock("@/components/ui/table", () => {
  const React = require("react");
  const createComponent = (Tag = "div") => ({ children, ...props }: any) =>
    React.createElement(Tag, props, children);
  return {
    Table: createComponent("table"),
    TableBody: createComponent("tbody"),
    TableCell: createComponent("td"),
    TableHead: createComponent("th"),
    TableHeader: createComponent("thead"),
    TableRow: createComponent("tr"),
  };
});

jest.mock("@/components/ui/badge", () => {
  const React = require("react");
  return {
    Badge: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  };
});

jest.mock("@/components/ui/skeleton", () => {
  const React = require("react");
  return {
    Skeleton: ({ className }: { className?: string }) => (
      <div role="status" className={className}>
        Loading
      </div>
    ),
  };
});

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
}));

jest.mock("@/hooks/useLeaveRequests", () => ({
  useLeaveRequests: jest.fn(),
  useCancelLeaveRequest: jest.fn(),
  __esModule: true,
}));

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("@/components/ui/date-range-picker", () => ({
  DateRangePicker: ({ onDateRangeChange }: { onDateRangeChange?: (range: any) => void }) => (
    <button
      type="button"
      data-testid="date-range-picker"
      onClick={() =>
        onDateRangeChange?.({
          from: new Date("2024-01-01"),
          to: new Date("2024-01-05"),
        })
      }
    >
      Date Picker
    </button>
  ),
}));

jest.mock("@/components/ui/select", () => {
  const React = require("react");

  const Select = ({ value, onValueChange, children }: any) => {
    const items = React.Children.toArray(children).flatMap((child: any) => {
      if (child?.type?.displayName === "SelectContent") {
        return React.Children.toArray(child.props.children);
      }
      return [];
    });

    return (
      <select
        aria-label="select"
        value={value}
        onChange={(event) => onValueChange?.(event.target.value)}
      >
        {items}
      </select>
    );
  };

  const SelectTrigger = ({ children }: any) => <>{children}</>;
  const SelectContent = ({ children }: any) => <>{children}</>;
  const SelectItem = ({ value, children }: any) => <option value={value}>{children}</option>;
  const SelectValue = ({ children }: any) => <>{children}</>;

  SelectContent.displayName = "SelectContent";

  return {
    Select,
    SelectTrigger,
    SelectContent,
    SelectItem,
    SelectValue,
  };
});

const mockUseSession = useSession as jest.Mock;
const mockUseLeaveRequests = useLeaveRequests as jest.Mock;
const mockUseCancelLeaveRequest = useCancelLeaveRequest as jest.Mock;

const buildHookResponse = (overrides = {}) => ({
  data: {
    requests: [
      {
        id: "req-1",
        startDate: "2024-02-01",
        endDate: "2024-02-03",
        reason: "Family trip",
        status: "APPROVED",
        days: 3,
        createdAt: "2024-01-15",
        adminComment: "Enjoy!",
      },
    ],
    total: 1,
    totalPages: 1,
    page: 1,
    limit: 10,
    ...overrides,
  },
  isLoading: false,
  error: null,
  refetch: jest.fn(),
});

describe("LeaveRequestsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: "user-1",
          name: "Test User",
          email: "test@example.com",
        },
      },
      status: "authenticated",
    });

    mockUseLeaveRequests.mockReturnValue(buildHookResponse());
    mockUseCancelLeaveRequest.mockReturnValue({
      mutateAsync: jest.fn(),
      isPending: false,
    });
  });

  it("renders leave requests when data is available", () => {
    render(<LeaveRequestsPage />);

    expect(screen.getByText("My Leave History")).toBeInTheDocument();
    expect(screen.getAllByText(/Family trip/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText("APPROVED")[0]).toBeInTheDocument();
    expect(screen.getAllByText(/Enjoy!/i)[0]).toBeInTheDocument();
  });

  it("shows empty state when no requests exist", () => {
    mockUseLeaveRequests.mockReturnValue(
      buildHookResponse({
        requests: [],
        total: 0,
        totalPages: 1,
      })
    );

    render(<LeaveRequestsPage />);

    expect(screen.getByText(/No leave requests found/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Submit New Request/i })).toBeInTheDocument();
  });

  it("applies and clears date filters", async () => {
    render(<LeaveRequestsPage />);

    const picker = screen.getByTestId("date-range-picker");
    fireEvent.click(picker);

    await waitFor(() =>
      expect(mockUseLeaveRequests).toHaveBeenLastCalledWith(
        expect.objectContaining({
          startDate: "2024-01-01",
          endDate: "2024-01-05",
        })
      )
    );

    const clearButton = await screen.findByRole("button", { name: /clear filters/i });
    fireEvent.click(clearButton);

    await waitFor(() =>
      expect(mockUseLeaveRequests).toHaveBeenLastCalledWith(
        expect.objectContaining({
          startDate: undefined,
          endDate: undefined,
        })
      )
    );
  });
});

