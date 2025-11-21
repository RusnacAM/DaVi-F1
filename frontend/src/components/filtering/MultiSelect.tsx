import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import type { SelectChangeEvent } from "@mui/material/Select";
import type React from "react";
import { FormControl } from "@mui/material";

interface MultiSelectProps {
  value: string[];
  setValue: (eventVal: string[]) => void;
  menuItems: string[];
  width: number;
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
  value,
  setValue,
  menuItems,
  width,
}) => {
  const handleChange = (event: SelectChangeEvent<typeof value>) => {
    setValue(event.target.value as string[]);
  };

  return (
    <FormControl>
      <Select
        id="session-year-select"
        value={value}
        onChange={handleChange}
        multiple
        className="filter-select"
        sx={{
          width: width,
          textAlign: "center",
          height: 40,
          padding: "15px",
          borderRadius: "4px",
          boxShadow: "rgb(82, 82, 82) 0.1rem 0.1rem 0.3rem",
          border: "2px solid rgb(82, 82, 82)",
          color: "white",
          backgroundColor: "rgb(25, 27, 31)",
          "& .MuiSvgIcon-root": {
            color: "white",
          },
        }}
      >
        {menuItems.map((menuItem) => (
          <MenuItem key={menuItem} value={menuItem}>
            {menuItem}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
