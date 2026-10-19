import PanelPage from "@/components/PanelPage";
import ReservationsManagement from "@/components/ReservationsManagement";
import { useAuth } from "@/hooks/useAuth";

const Reservations = () => {
  const { venue } = useAuth();

  return (
    <PanelPage title="Reservas" subtitle="Gestioná las reservas de mesas de tu comercio">
      <ReservationsManagement venueName={venue?.name} />
    </PanelPage>
  );
};

export default Reservations;
