import Foundation

class SearchViewModel: ObservableObject {
    @Published var movies: [Movie] = []

    @Published var movieTitle = "" {
        didSet {
            self.fetchMovies()
        }
    }
    @Published var selectedGenre = ""
    @Published var selectedOrdering = "title:asc"

    let ordering: [String: String] = ["title:asc": "Titre A-Z", "title:desc": "Titre Z-A", "date:desc": "Plus récents d'abord", "date:asc": "Plus vieux d'abord"]
    let genres: [String: String] = ["": "none", "action": "Action", "animation": "Animation", "adventure": "Aventure", "comedy": "Comédie", "drama": "Drame", "science_fiction": "Science-fiction", "thriller": "Thriller"]
    
    private func fetchMovies() {
        guard let url = URL(string: "http://192.168.0.210:8080/movies?title=\(self.movieTitle)&genre=\(self.selectedGenre)&orderBy=\(self.selectedOrdering)&limit=50") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            if let error = error {
                print("Erreur : \(error.localizedDescription)")
                return
            }
            guard let data = data else {
                if data == nil {
                    self?.movies = []
                }
                return
            }
            if String(data: data, encoding: .utf8) ?? "" != "null" {
                self?.movies.removeAll()
                return
            }
            if let movies = try? JSONDecoder().decode([Movie].self, from: data) {
                DispatchQueue.main.async {
                    self?.movies = movies
                    print("fetchMovies : OK")
                }
            } else {
                print("Erreur : impossible de décoder le nouveau film")
            }
        }.resume()
    }
}
