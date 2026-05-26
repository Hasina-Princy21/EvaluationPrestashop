import { useState } from "react";
import ProductService from "../../api/productService";
import OrderService from "../../api/orderService";
import CategoryService from "../../api/categoryService";
import CustomerService from "../../api/customerService";
import AddressService from "../../api/addressService";
import SupplierService from "../../api/supplierService";
import CardService from "../../api/cardService";
import "./ResetData.css";

type ResetStep = {
  name: string;
  action: () => Promise<void>;
  status: "idle" | "loading" | "success" | "error";
  errorMsg?: string;
};

const ResetData = () => {
  const [isResetting, setIsResetting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [globalSuccess, setGlobalSuccess] = useState(false);

  const [steps, setSteps] = useState<ResetStep[]>([
    { name: "Suppression des commandes", action: () => OrderService.resetData(), status: "idle" },
    { name: "Suppression des paniers", action: () => CardService.resetData(), status: "idle" },
    { name: "Suppression des produits", action: () => ProductService.resetData(), status: "idle" },
    { name: "Suppression des catégories", action: () => CategoryService.resetData(), status: "idle" },
    { name: "Suppression des clients", action: () => CustomerService.resetData(), status: "idle" },
    { name: "Suppression des adresses", action: () => AddressService.resetData(), status: "idle" },
    { name: "Suppression des fournisseurs", action: () => SupplierService.resetData(), status: "idle" },
  ]);

  const handleReset = async () => {
    setShowConfirm(false);
    setIsResetting(true);
    setGlobalError(null);
    setGlobalSuccess(false);

    // Copy steps for mutation
    const updatedSteps: ResetStep[] = [...steps].map(step => ({ ...step, status: "idle" }));
    setSteps(updatedSteps);

    for (let i = 0; i < updatedSteps.length; i++) {
      updatedSteps[i].status = "loading";
      setSteps([...updatedSteps]);

      try {
        await updatedSteps[i].action();
        updatedSteps[i].status = "success";
      } catch (err: any) {
        console.error(`Error in reset step ${updatedSteps[i].name}:`, err);
        updatedSteps[i].status = "error";
        updatedSteps[i].errorMsg = err?.message || "Erreur de connexion.";
        setGlobalError(`Erreur lors de l'étape : ${updatedSteps[i].name}`);
        setIsResetting(false);
        return;
      }
      setSteps([...updatedSteps]);
    }

    setGlobalSuccess(true);
    setIsResetting(false);
  };

  return (
    <div className="reset-data-container">
      <div className="reset-card">
        <div className="card-header">
          <div className="warning-badge">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="alert-icon">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <span>Action Irrémédiable</span>
          </div>
          <h1>Réinitialisation Globale des Données</h1>
          <p className="card-subtitle">
            Cette action effacera complètement toutes les données de votre boutique PrestaShop (commandes, paniers, produits, catégories, clients, adresses, fournisseurs).
          </p>
        </div>

        {!isResetting && !globalSuccess && !globalError && (
          <div className="reset-initial-view">
            <button className="danger-btn-large" onClick={() => setShowConfirm(true)}>
              <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
              Réinitialiser la Base de Données
            </button>
          </div>
        )}

        {(isResetting || globalSuccess || globalError) && (
          <div className="steps-container">
            {steps.map((step, idx) => (
              <div key={idx} className={`step-item ${step.status}`}>
                <div className="step-indicator">
                  {step.status === "idle" && <span className="dot"></span>}
                  {step.status === "loading" && <div className="spinner"></div>}
                  {step.status === "success" && (
                    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="3" fill="none" className="check-icon">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                  {step.status === "error" && <span className="error-dot">!</span>}
                </div>
                <div className="step-details">
                  <span className="step-name">{step.name}</span>
                  {step.status === "error" && <span className="step-error-msg">{step.errorMsg}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {globalSuccess && (
          <div className="success-banner">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" className="banner-icon">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <div className="banner-text">
              <h3>Boutique réinitialisée avec succès !</h3>
              <p>Toutes les données ont été supprimées. La boutique est désormais propre et prête pour l'import.</p>
            </div>
            <button className="btn-ok" onClick={() => { setGlobalSuccess(false); setSteps(steps.map(s => ({ ...s, status: "idle" }))); }}>
              Terminer
            </button>
          </div>
        )}

        {globalError && (
          <div className="error-banner">
            <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" className="banner-icon">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            <div className="banner-text">
              <h3>Échec de la réinitialisation</h3>
              <p>{globalError}</p>
            </div>
            <button className="btn-retry" onClick={handleReset}>
              Réessayer
            </button>
          </div>
        )}
      </div>

      {showConfirm && (
        <div className="modal-overlay">
          <div className="confirm-modal">
            <h2>Êtes-vous absolument sûr ?</h2>
            <p>
              Cette opération est définitive. Elle va détruire tous les produits, déclinaisons, catégories personnalisées, commandes passées et clients enregistrés.
            </p>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowConfirm(false)}>
                Annuler
              </button>
              <button className="danger-btn-confirm" onClick={handleReset}>
                Oui, réinitialiser tout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResetData;
