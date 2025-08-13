import Foundation

class HomeViewModel: ObservableObject {
    @Published var users: [User] = []
    @Published var showingSheet: Bool = false
    
    init() {
        self.fetchUsers()
    }

    private func fetchUsers() {
        guard let url = URL(string: "http://192.168.0.210:8080/users") else {
            return
        }

        URLSession.shared.dataTask(with: url) { [weak self] data, _, error in
            guard error == nil, let data = data else {
                print(error ?? "Unknown error")
                return
            }

            let users = (String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines) == "null")
                ? [] : (try? JSONDecoder().decode([User].self, from: data)) ?? []

            DispatchQueue.main.async {
                self?.users = users
                print("method fetchUser : OK")
            }
        }.resume()
    }
    
    func createUser(name: String) {
        guard let url = URL(string: "http://192.168.0.210:8080/users") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let user = User(id: nil, name: name)
        guard let data = try? JSONEncoder().encode(user) else {
            print("Erreur lors de l'encodage JSON")
            return
        }
        request.httpBody = data

        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            if let error = error {
                print("Erreur : \(error.localizedDescription)")
                return
            }
            guard let data = data else {
                print("Erreur : pas de données reçues")
                return
            }
            if let newUser = try? JSONDecoder().decode(User.self, from: data) {
                DispatchQueue.main.async {
                    self?.users.append(newUser)
                    print("createUser : OK")
                }
            } else {
                print("Erreur : impossible de décoder le nouvel utilisateur")
            }
        }.resume()
    }

    func deleteUser(id: String) {
        guard let url = URL(string: "http://192.168.0.210:8080/users/\(id)") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"

        URLSession.shared.dataTask(with: request) { [weak self] _, _, error in
            if let error = error {
                print("Erreur : \(error.localizedDescription)")
                return
            }
            DispatchQueue.main.async {
                self?.users.removeAll { $0.id == id }
                print("deleteUser : OK")
            }
        }.resume()
    }
}
