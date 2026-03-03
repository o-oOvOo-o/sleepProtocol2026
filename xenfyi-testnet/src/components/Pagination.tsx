const Pagination = ({ currentPage, totalPages, onPageChange }: { currentPage: number, totalPages: number, onPageChange: (page: number) => void }) => {
    const handlePrevious = () => {
        if (currentPage > 1) {
            onPageChange(currentPage - 1);
        }
    };

    const handleNext = () => {
        if (currentPage < totalPages) {
            onPageChange(currentPage + 1);
        }
    };

    if (totalPages <= 1) {
        return null;
    }

    return (
        <div className="flex justify-center items-center space-x-2 mt-4">
            <button onClick={handlePrevious} disabled={currentPage === 1} className="btn btn-ghost">«</button>
            <span className="btn btn-ghost no-animation">Page {currentPage} of {totalPages}</span>
            <button onClick={handleNext} disabled={currentPage === totalPages} className="btn btn-ghost">»</button>
        </div>
    );
};

export default Pagination;
