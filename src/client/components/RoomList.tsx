import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  DataGrid,
  GridColDef,
  GridFooter,
  GridFooterContainer,
} from "@mui/x-data-grid";
import { Alert, Button, Paper, Snackbar } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { CreateRoomDialog } from "./CreateRoomDialog";
import { CreateRoom } from "../../model/CreateRoom";

const columns: GridColDef[] = [
  { field: "id", headerName: "ID", type: "string", width: 70 },
  { field: "name", headerName: "Name", type: "string", width: 200 },
  {
    field: "board",
    headerName: "Board",
    headerAlign: "center",
    type: "string",
    align: "center",
    width: 100,
  },
  {
    field: "players",
    headerName: "Players",
    headerAlign: "center",
    type: "string",
    align: "center",
    width: 70,
    // sortComparator: (p1, p2) =>
    //   parseInt(p1.split("/")[0]) - parseInt(p2.split("/")[0]),
  },
];

export function RoomList(): React.ReactElement {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [rooms, setRooms] = useState([]);

  const [loading, setLoading] = useState(true);

  const loadRooms = useCallback(() => {
    fetch("/api/rooms")
      .then((res) => res.json())
      .then((rooms) => {
        setRooms(rooms);
        setLoading(false);
      });
  }, [setRooms]);

  useEffect(loadRooms, [loadRooms]);

  const createRoom = useCallback(
    (data: CreateRoom) => {
      setLoading(true);
      fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
        .then((res) => res.json())
        .then((room) => {
          setRooms([...rooms, room]);
          setLoading(false);
        });
    },
    [setRooms, rooms],
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(params.has("errorId"));

  return (
    <Paper>
      <DataGrid
        columns={columns}
        rows={rooms}
        onRowClick={(row) => navigate(`/room/${row.id}`)}
        initialState={{
          pagination: { paginationModel: { pageSize: 10 } },
        }}
        pageSizeOptions={[20]}
        sx={{
          ".MuiDataGrid-cell": {
            cursor: "pointer",
          },
        }}
        loading={loading}
        slots={{
          footer: () => (
            <GridFooterContainer>
              <Button
                onClick={() => setDialogOpen(true)}
                startIcon={<AddIcon />}
                sx={{ marginLeft: 1 }}
              >
                Create room
              </Button>
              <GridFooter sx={{ border: "none" }} />
            </GridFooterContainer>
          ),
        }}
      />

      <CreateRoomDialog
        open={dialogOpen}
        onSubmit={createRoom}
        onClose={() => setDialogOpen(false)}
      />

      <Snackbar
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        open={alertOpen}
        onClose={(_, reason) => {
          if (reason !== "clickaway") setAlertOpen(false);
        }}
        autoHideDuration={5000}
      >
        <Alert severity="error" sx={{ width: "100%" }}>
          Room {params.get("errorId")} does not exist
        </Alert>
      </Snackbar>
    </Paper>
  );
}
