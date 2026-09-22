import WaitingListTransactionalEmail from "./_components/waiting-list-transactional-email";

export default function WaitingListPreview() {
  return (
    <WaitingListTransactionalEmail
      organizationName="AGESCI Adelfia 1"
      heading="Richiesta ricevuta"
      paragraphs={[
        [{ text: "Gentile famiglia," }],
        [
          { text: "La richiesta di inserimento nella lista d’attesa per " },
          { text: "Mario Rossi", strong: true },
          { text: " è stata ricevuta correttamente." },
        ],
        [
          { text: "Consulta il sito del Gruppo", href: "https://gruppi.agesci.it/adelfia1/" },
          { text: " per maggiori informazioni." },
        ],
      ]}
      action={{
        label: "Apri la lista d’attesa",
        url: "https://example.com/lista-attesa",
      }}
    />
  );
}
